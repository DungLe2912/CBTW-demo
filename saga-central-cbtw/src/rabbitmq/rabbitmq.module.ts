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
              arguments: {
                'x-dead-letter-exchange': 'dlx',
                'x-dead-letter-routing-key': 'order-queue.dlq',
              },
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
              arguments: {
                'x-dead-letter-exchange': 'dlx',
                'x-dead-letter-routing-key': 'customer-queue.dlq',
              },
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
              arguments: {
                'x-dead-letter-exchange': 'dlx',
                'x-dead-letter-routing-key': 'product-queue.dlq',
              },
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
              arguments: {
                'x-dead-letter-exchange': 'dlx',
                'x-dead-letter-routing-key': 'sec-queue.dlq',
              },
            },
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class RabbitMqModule {}
