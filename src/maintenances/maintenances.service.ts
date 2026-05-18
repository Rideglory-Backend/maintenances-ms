import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  CreateMaintenanceDto,
  FindMaintenancesFilterDto,
  MaintenanceMode,
  MaintenanceSortBy,
  UpdateMaintenanceDto,
} from '@rideglory/contracts';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { USERS_SERVICE } from '../config';

@Injectable()
export class MaintenancesService extends PrismaClient implements OnModuleInit {
  private logger = new Logger('Maintenances Service');

  constructor(
    @Inject(USERS_SERVICE) private readonly usersService: ClientProxy,
  ) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is not set');
    }

    super({
      adapter: new PrismaPg({ connectionString: url }),
    });

    this.logger.log('Database connected');
  }

  async onModuleInit() {
    await this.$connect();
  }

  private async validateOwnerExists(userId: string) {
    try {
      await firstValueFrom(
        this.usersService.send('findOneUser', { id: userId }).pipe(timeout(3000)),
      );
    } catch {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: `Owner user with id ${userId} does not exist`,
      });
    }
  }

  /**
   * Creates one or two maintenance records.
   *
   * When mode == COMPLETED and nextKmInterval or nextDate is provided,
   * a second SCHEDULED record is auto-created.
   *
   * Returns: { created: Maintenance[] } — array of 1 or 2 records.
   */
  async create(createMaintenanceDto: CreateMaintenanceDto) {
    await this.validateOwnerExists(createMaintenanceDto.userId);

    const {
      userId,
      vehicleId,
      type,
      mode,
      serviceDate,
      odometerAtService,
      workshop,
      notes,
      nextKmInterval,
      nextOdometer: nextOdometerInput,
      nextDate,
      cost,
    } = createMaintenanceDto;

    // Use nextOdometer directly if provided; otherwise compute from nextKmInterval
    const nextOdometer =
      nextOdometerInput != null
        ? nextOdometerInput
        : nextKmInterval != null && odometerAtService != null
          ? odometerAtService + nextKmInterval
          : nextKmInterval != null
            ? nextKmInterval
            : undefined;

    const primary = await this.maintenance.create({
      data: {
        userId,
        vehicleId,
        type,
        mode,
        serviceDate: serviceDate ?? null,
        odometerAtService: odometerAtService ?? null,
        workshop: workshop ?? null,
        notes: notes ?? null,
        nextDate: nextDate ?? null,
        nextOdometer: nextOdometer ?? null,
        cost: cost ?? null,
        isDeleted: false,
      },
    });

    // Auto-create SCHEDULED record when completed + next fields provided
    const shouldCreateScheduled =
      mode === MaintenanceMode.COMPLETED &&
      (nextKmInterval != null || nextDate != null);

    if (!shouldCreateScheduled) {
      return { created: [primary] };
    }

    const scheduled = await this.maintenance.create({
      data: {
        userId,
        vehicleId,
        type,
        mode: MaintenanceMode.SCHEDULED,
        serviceDate: null,
        odometerAtService: null,
        workshop: null,
        notes: null,
        nextDate: nextDate ?? null,
        nextOdometer: nextOdometer ?? null,
        cost: null,
        isDeleted: false,
      },
    });

    return { created: [primary, scheduled] };
  }

  async findByVehicleId(vehicleId: string, filter?: FindMaintenancesFilterDto) {
    const now = new Date();

    const where = {
      vehicleId,
      isDeleted: false,
      ...(filter?.types?.length ? { type: { in: filter.types } } : {}),
      ...(filter?.mode ? { mode: filter.mode } : {}),
      ...(filter?.startDate || filter?.endDate
        ? {
            serviceDate: {
              ...(filter.startDate ? { gte: new Date(filter.startDate) } : {}),
              ...(filter.endDate ? { lte: new Date(filter.endDate) } : {}),
            },
          }
        : {}),
      ...(filter?.urgentOnly
        ? {
            nextDate: {
              lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            },
          }
        : {}),
    };

    const orderBy = this.buildOrderBy(filter?.sortBy);
    const items = await this.maintenance.findMany({ where, orderBy });

    const allItems = filter
      ? await this.maintenance.findMany({
          where: { vehicleId, isDeleted: false },
          orderBy: { createdAt: 'desc' },
        })
      : items;

    const completedItems = allItems.filter(
      (m) => m.mode === MaintenanceMode.COMPLETED,
    );
    const lastCompleted = completedItems.sort(
      (a, b) => (b.serviceDate?.getTime() ?? 0) - (a.serviceDate?.getTime() ?? 0),
    )[0];

    const futureNextDates = allItems
      .map((m) => m.nextDate)
      .filter((d): d is Date => d != null && d.getTime() > now.getTime());

    const nextServiceDate =
      futureNextDates.length === 0
        ? null
        : new Date(Math.min(...futureNextDates.map((d) => d.getTime())));

    return {
      items,
      summary: {
        lastServiceDate: lastCompleted?.serviceDate ?? null,
        lastServiceMileage: lastCompleted?.odometerAtService ?? null,
        nextServiceDate,
      },
    };
  }

  private buildOrderBy(sortBy?: MaintenanceSortBy) {
    switch (sortBy) {
      case MaintenanceSortBy.TYPE:
        return { type: 'asc' as const };
      case MaintenanceSortBy.NEXT_MAINTENANCE:
        return { nextDate: 'asc' as const };
      case MaintenanceSortBy.DATE:
      default:
        return { createdAt: 'desc' as const };
    }
  }

  async findMaintenancesDueSoon(daysAhead: number) {
    const now = new Date();
    const targetFrom = new Date(now.getTime() + (daysAhead - 1) * 24 * 60 * 60 * 1000);
    const targetTo = new Date(now.getTime() + (daysAhead + 1) * 24 * 60 * 60 * 1000);

    return this.maintenance.findMany({
      where: {
        nextDate: { gte: targetFrom, lte: targetTo },
        reminderSentAt: null,
        isDeleted: false,
      },
    });
  }

  async markReminderSent(maintenanceId: string): Promise<void> {
    await this.maintenance.update({
      where: { id: maintenanceId },
      data: { reminderSentAt: new Date() },
    });
  }

  softDeleteAllByVehicleId(vehicleId: string) {
    return this.maintenance.updateMany({
      where: { vehicleId, isDeleted: false },
      data: { isDeleted: true },
    });
  }

  async update(id: string, vehicleId: string, updateMaintenanceDto: UpdateMaintenanceDto) {
    if (updateMaintenanceDto.userId) {
      await this.validateOwnerExists(updateMaintenanceDto.userId);
    }

    const maintenance = await this.maintenance.findFirst({
      where: { id, vehicleId, isDeleted: false },
    });

    if (!maintenance) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Maintenance with id ${id} not found for vehicle ${vehicleId}`,
      });
    }

    const {
      serviceDate,
      odometerAtService,
      workshop,
      nextKmInterval,
      nextOdometer: nextOdometerInput,
      nextDate,
      mode,
      ...rest
    } = updateMaintenanceDto as any;

    const nextOdometer =
      nextOdometerInput != null
        ? nextOdometerInput
        : nextKmInterval != null && odometerAtService != null
          ? odometerAtService + nextKmInterval
          : nextKmInterval != null && maintenance.odometerAtService != null
            ? maintenance.odometerAtService + nextKmInterval
            : undefined;

    const updateData = {
      ...rest,
      ...(mode !== undefined ? { mode } : {}),
      ...(serviceDate !== undefined ? { serviceDate } : {}),
      ...(odometerAtService !== undefined ? { odometerAtService } : {}),
      ...(workshop !== undefined ? { workshop } : {}),
      ...(nextDate !== undefined ? { nextDate } : {}),
      ...(nextOdometer !== undefined ? { nextOdometer } : {}),
    };

    return this.maintenance.update({
      where: { id },
      data: updateData,
    });
  }

  async softDelete(id: string, vehicleId: string) {
    const maintenance = await this.maintenance.findFirst({
      where: { id, vehicleId, isDeleted: false },
    });

    if (!maintenance) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Maintenance with id ${id} not found for vehicle ${vehicleId}`,
      });
    }

    return this.maintenance.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
