import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DataSource } from 'typeorm';

import { ProductEntity } from '../../../entities';
import { UpdateInventoryCommand } from '../impl';

@CommandHandler(UpdateInventoryCommand)
export class UpdateInventoryCommandHandler implements ICommandHandler<UpdateInventoryCommand> {
  constructor(private readonly dataSource: DataSource) {}

  async execute({ products }: UpdateInventoryCommand): Promise<boolean> {
    Logger.log('Start updateInventory');
    if (!products.length) {
      return true;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of products) {
        const result = await queryRunner.manager
          .createQueryBuilder()
          .update(ProductEntity)
          .set({
            stockQuantity: () => '"stockQuantity" - :qty',
          })
          .where('id = :id', { id: item.productId })
          .andWhere('"stockQuantity" >= :qty', { qty: item.quantity })
          .execute();

        if (!result.affected) {
          Logger.debug(
            `Cannot reserveStock productId=${item.productId} qty=${item.quantity}`,
          );
          await queryRunner.rollbackTransaction();
          return false;
        }
      }

      await queryRunner.commitTransaction();
      return true;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      Logger.debug('updateInventory failed', error as Error);
      return false;
    } finally {
      await queryRunner.release();
    }
  }
}
