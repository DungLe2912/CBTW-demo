import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'customerClient',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://admin:admin123@localhost:5672'],
          queue: 'customer-queue',
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
