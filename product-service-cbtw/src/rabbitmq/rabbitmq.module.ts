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
            arguments: {
              'x-dead-letter-exchange': 'dlx',
              'x-dead-letter-routing-key': 'product-queue.dlq',
            },
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
            arguments: {
              'x-dead-letter-exchange': 'dlx',
              'x-dead-letter-routing-key': 'sec-queue.dlq',
            },
          },
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class RabbitMqModule {}
