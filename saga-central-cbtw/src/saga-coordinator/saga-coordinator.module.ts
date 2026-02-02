import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SagaCoordinatorController } from './saga-coordinator.controller';
import { SagaCoordinatorService } from './saga-coordinator.service';
import { RabbitMqModule } from 'src/rabbitmq/rabbitmq.module';
import { OrderRequestEntity } from '../entities/order-request.entity';

@Module({
  imports: [RabbitMqModule, TypeOrmModule.forFeature([OrderRequestEntity])],
  controllers: [SagaCoordinatorController],
  providers: [SagaCoordinatorService],
})
export class SagaCoordinatorModule {}
