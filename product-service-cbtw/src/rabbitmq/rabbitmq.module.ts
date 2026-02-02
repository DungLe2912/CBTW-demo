import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'stockClient',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://admin:admin123@localhost:5672'],
          queue: 'product-queue',
          queueOptions: {
            durable: true,
          },
        },
      },
      {
        name: 'sagaService',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://admin:admin123@localhost:5672'],
          queue: 'sec-queue',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class RabbitMqModule {}
