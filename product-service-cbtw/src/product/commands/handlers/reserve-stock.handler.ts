import { Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { ProductEntity } from '../../../entities';
import { ReserveStockCommand } from '../impl';

@CommandHandler(ReserveStockCommand)
export class ReserveStockCommandHandler implements ICommandHandler<ReserveStockCommand> {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
  ) {}

  async execute({ products }: ReserveStockCommand): Promise<boolean> {
    const ids = products.map((prd) => prd.productId);
    const productEntities = await this.productRepository.find({
      where: { id: In(ids) },
    });
    if (productEntities.length !== products.length) {
      Logger.debug('At least one of product in payload does not match');
      return false;
    }

    const productMap = new Map(
      productEntities.map((product) => [product.id, product]),
    );
    const isReserveStock = products.every((item) => {
      const product = productMap.get(item.productId);
      return !!product && product.stockQuantity - item.quantity >= 0;
    });

    if (isReserveStock) {
      Logger.log('Can reserveStock');
    } else {
      Logger.debug('Cannot reserveStock');
    }

    return isReserveStock;
  }
}
