import { Module } from '@nestjs/common';
import { SagaCoordinatorController } from './saga-coordinator.controller';
import { SagaCoordinatorService } from './saga-coordinator.service';
import { RabbitMqModule } from 'src/rabbitmq/rabbitmq.module';

@Module({
  imports: [RabbitMqModule],
  controllers: [SagaCoordinatorController],
  providers: [SagaCoordinatorService],
})
export class SagaCoordinatorModule {}
