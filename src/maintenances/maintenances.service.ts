import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  CreateMaintenanceDto,
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

  async create(createMaintenanceDto: CreateMaintenanceDto) {
    await this.validateOwnerExists(createMaintenanceDto.userId);

    return this.maintenance.create({
      data: {
        ...createMaintenanceDto,
        isDeleted: false,
      },
    });
  }

  findByVehicleId(vehicleId: string) {
    return this.maintenance.findMany({
      where: { vehicleId, isDeleted: false },
      orderBy: { date: 'desc' },
    });
  }

  async update(id: string, vehicleId: string, updateMaintenanceDto: UpdateMaintenanceDto) {
    if (updateMaintenanceDto.userId) {
      await this.validateOwnerExists(updateMaintenanceDto.userId);
    }

    const maintenance = await this.maintenance.findFirst({
      where: {
        id,
        vehicleId,
        isDeleted: false,
      },
    });

    if (!maintenance) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Maintenance with id ${id} not found for vehicle ${vehicleId}`,
      });
    }

    return this.maintenance.update({
      where: { id },
      data: updateMaintenanceDto,
    });
  }

  async softDelete(id: string, vehicleId: string) {
    const maintenance = await this.maintenance.findFirst({
      where: {
        id,
        vehicleId,
        isDeleted: false,
      },
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
