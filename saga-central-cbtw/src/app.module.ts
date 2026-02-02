import { Module } from '@nestjs/common';
import { DevtoolsModule } from '@nestjs/devtools-integration';
import { SagaCoordinatorModule } from './saga-coordinator/saga-coordinator.module';

@Module({
  imports: [
    DevtoolsModule.register({
      http: true,
    }),
    SagaCoordinatorModule,
  ],
})
export class AppModule {}
