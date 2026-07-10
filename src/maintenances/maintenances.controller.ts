import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateMaintenanceDto,
  FindMaintenancesFilterDto,
  SoftDeleteMaintenancePayloadDto,
  UpdateMaintenancePayloadDto,
} from '@rideglory/contracts';
import { MaintenancesService } from './maintenances.service';

@Controller()
export class MaintenancesController {
  constructor(private readonly maintenancesService: MaintenancesService) {}

  @MessagePattern('createMaintenance')
  create(@Payload() createMaintenanceDto: CreateMaintenanceDto) {
    return this.maintenancesService.create(createMaintenanceDto);
  }

  @MessagePattern('findMaintenancesByVehicleId')
  findByVehicleId(
    @Payload() payload: { vehicleId: string; filter?: FindMaintenancesFilterDto },
  ) {
    return this.maintenancesService.findByVehicleId(
      payload.vehicleId,
      payload.filter,
    );
  }

  @MessagePattern('updateMaintenance')
  update(@Payload() updateMaintenanceDto: UpdateMaintenancePayloadDto) {
    const { id, vehicleId, ...data } = updateMaintenanceDto;
    return this.maintenancesService.update(id, vehicleId, data);
  }

  @MessagePattern('softDeleteMaintenance')
  softDelete(@Payload() payload: SoftDeleteMaintenancePayloadDto) {
    return this.maintenancesService.softDelete(payload.id, payload.vehicleId);
  }

  @MessagePattern('softDeleteMaintenancesByVehicleId')
  softDeleteAllByVehicleId(@Payload('vehicleId') vehicleId: string) {
    return this.maintenancesService.softDeleteAllByVehicleId(vehicleId);
  }

  @MessagePattern('softDeleteMaintenancesByUserId')
  softDeleteAllByUserId(@Payload('userId') userId: string) {
    return this.maintenancesService.softDeleteAllByUserId(userId);
  }

  @MessagePattern('findMaintenancesDueSoon')
  findMaintenancesDueSoon(@Payload() payload: { daysAhead: number }) {
    return this.maintenancesService.findMaintenancesDueSoon(payload.daysAhead);
  }

  @MessagePattern('markMaintenanceReminderSent')
  markMaintenanceReminderSent(@Payload() payload: { maintenanceId: string }) {
    return this.maintenancesService.markReminderSent(payload.maintenanceId);
  }
}
