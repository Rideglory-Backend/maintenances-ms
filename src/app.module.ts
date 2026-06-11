import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { ClsModule, ClsService } from 'nestjs-cls';
import { MaintenancesModule } from './maintenances/maintenances.module';
import { ClsRpcInterceptor, pinoHttpOptions } from '@rideglory/common-lib';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ClsService],
      useFactory: (cls: ClsService) =>
        pinoHttpOptions('MaintenancesMicroservice', () => cls.get<string>('traceId')),
    }),
    ClsModule.forRoot({ global: true, middleware: { mount: false } }),
    MaintenancesModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      inject: [ClsService],
      useFactory: (cls: ClsService) => new ClsRpcInterceptor(cls),
    },
  ],
})
export class AppModule {}
