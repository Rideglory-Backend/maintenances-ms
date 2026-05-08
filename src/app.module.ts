import { Module } from '@nestjs/common';
import { MaintenancesModule } from './maintenances/maintenances.module';

@Module({
  imports: [MaintenancesModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
