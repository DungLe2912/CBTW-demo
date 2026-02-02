import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'orderService',
        useFactory: () => ({
          transport: Transport.RMQ,
          options: {
            urls: ['amqp://admin:admin123@localhost:5672'],
            queue: 'order-queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
      {
        name: 'customerService',
        useFactory: () => ({
          transport: Transport.RMQ,
          options: {
            urls: ['amqp://admin:admin123@localhost:5672'],
            queue: 'customer-queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
      {
        name: 'productService',
        useFactory: () => ({
          transport: Transport.RMQ,
          options: {
            urls: ['amqp://admin:admin123@localhost:5672'],
            queue: 'product-queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
      {
        name: 'sagaService',
        useFactory: () => ({
          transport: Transport.RMQ,
          options: {
            urls: ['amqp://admin:admin123@localhost:5672'],
            queue: 'sec-queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class RabbitMqModule {}
