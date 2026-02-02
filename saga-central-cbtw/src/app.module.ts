import { Module } from '@nestjs/common';
import { DevtoolsModule } from '@nestjs/devtools-integration';
import { SagaCoordinatorModule } from './saga-coordinator/saga-coordinator.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    DevtoolsModule.register({
      http: true,
    }),
    SagaCoordinatorModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT ?? '5432'),
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [__dirname + process.env.TYPEORM_ENTITIES],
      migrations: process.env.TYPEORM_MIGRATIONS
        ? [process.env.TYPEORM_MIGRATIONS]
        : [],
      logging: process.env.TYPEORM_LOGGING === 'true',
      synchronize: true,
      migrationsRun: process.env.TYPEORM_MIGRATION_RUN === 'true',
      migrationsTableName: 'migrations',
    }),
  ],
})
export class AppModule {}
