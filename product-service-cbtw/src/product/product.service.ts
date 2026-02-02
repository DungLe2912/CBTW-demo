/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ProductEntity } from 'src/entities';
import {
  CreateProductCommand,
  DeleteProductCommand,
  ReserveStockCommand,
  UpdateInventoryCommand,
  UpdateProductCommand,
} from './commands';
import { OrderItemDto } from './product.interface';
import { FindAllProductsQuery, FindOneProductQuery } from './queries';

@Injectable()
export class ProductService {
  private readonly processedReserveStock = new Map<string, boolean>();
  private readonly processedUpdateInventory = new Map<string, boolean>();

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Inject('sagaService') private readonly sagaService: ClientProxy,
  ) {}

  async getProducts(): Promise<ProductEntity[]> {
    return await this.queryBus.execute(new FindAllProductsQuery());
  }

  async getProductById(productId: number): Promise<ProductEntity> {
    return await this.queryBus.execute(new FindOneProductQuery(productId));
  }

  async createProduct(
    productData: Partial<ProductEntity>,
  ): Promise<ProductEntity> {
    return await this.commandBus.execute(new CreateProductCommand(productData));
  }

  async updateProduct(
    productId: number,
    productData: Partial<ProductEntity>,
  ): Promise<ProductEntity> {
    return await this.commandBus.execute(
      new UpdateProductCommand(productId, productData),
    );
  }

  async reserveStock(payload: {
    requestId?: string;
    products: OrderItemDto[];
  }): Promise<boolean> {
    if (payload.requestId) {
      const cached = this.processedReserveStock.get(payload.requestId);
      if (cached !== undefined) {
        return cached;
      }
    }

    const result = await this.commandBus.execute(
      new ReserveStockCommand(payload.products),
    );

    if (payload.requestId) {
      this.processedReserveStock.set(payload.requestId, result);
    }

    return result;
  }

  async updateInventory(payload: {
    requestId?: string;
    products: OrderItemDto[];
  }): Promise<boolean> {
    if (payload.requestId) {
      const cached = this.processedUpdateInventory.get(payload.requestId);
      if (cached !== undefined) {
        return cached;
      }
    }

    const result = await this.commandBus.execute(
      new UpdateInventoryCommand(payload.products),
    );

    if (payload.requestId) {
      this.processedUpdateInventory.set(payload.requestId, result);
    }

    return result;
  }

  async handleUpdateInventoryRequested(payload: {
    requestId?: string;
    orderId: number;
    customerId: number;
    products: OrderItemDto[];
    totalAmount: number;
  }): Promise<void> {
    const isStockReserve = await this.updateInventory({
      requestId: payload.requestId,
      products: payload.products,
    });

    if (isStockReserve) {
      this.sagaService.emit(
        { cmd: 'stockReserved' },
        {
          requestId: payload.requestId,
          orderId: payload.orderId,
          customerId: payload.customerId,
          products: payload.products,
          totalAmount: payload.totalAmount,
        },
      );
    } else {
      this.sagaService.emit(
        { cmd: 'stockNotAvailable' },
        {
          requestId: payload.requestId,
          orderId: payload.orderId,
          customerId: payload.customerId,
          products: payload.products,
          totalAmount: payload.totalAmount,
        },
      );
    }
  }

  async deleteProduct(productId: number): Promise<void> {
    return await this.commandBus.execute(new DeleteProductCommand(productId));
  }
}
