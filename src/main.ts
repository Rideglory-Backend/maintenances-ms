import './instrument';
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { RpcAllExceptionsFilter, TracingDeserializer } from '@rideglory/common-lib';
import { AppModule } from './app.module';
import { envs } from './config';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: envs.port,
        deserializer: new TracingDeserializer(),
      },
      bufferLogs: true,
    },
  );

  app.useLogger(app.get(Logger));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new RpcAllExceptionsFilter('maintenances-ms'));

  await app.listen();
  app.get(Logger).log(`Maintenances Microservice is running on port ${envs.port}`);
}

bootstrap();
