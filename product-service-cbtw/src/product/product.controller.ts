/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import { ProductEntity } from '../entities';
import { OrderItemDto } from './product.interface';
import { ProductService } from './product.service';

@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get('')
  async getProducts(): Promise<ProductEntity[]> {
    return this.productService.getProducts();
  }

  @Get(':id')
  async getProductById(@Param('id') id: number): Promise<ProductEntity> {
    return this.productService.getProductById(id);
  }

  @Post()
  async createProduct(
    @Body() productData: Partial<ProductEntity>,
  ): Promise<ProductEntity> {
    return this.productService.createProduct(productData);
  }

  @Put(':id')
  async updateProduct(
    @Param('id') id: number,
    @Body() productData: Partial<ProductEntity>,
  ): Promise<ProductEntity> {
    return this.productService.updateProduct(id, productData);
  }

  @Delete(':id')
  async deleteProduct(@Param('id') id: number): Promise<void> {
    return this.productService.deleteProduct(id);
  }

  @MessagePattern({ cmd: 'reserveStock' }, Transport.RMQ)
  async reserveStock(
    @Payload()
    payload: {
      requestId?: string;
      products: OrderItemDto[];
    },
    @Ctx() context: RmqContext,
  ): Promise<boolean> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const result = await this.productService.reserveStock(payload);
      channel.ack(originalMsg);
      return result;
    } catch (error) {
      this.retryOrDlq(channel, originalMsg);
      return false;
    }
  }

  @MessagePattern({ cmd: 'updateInventory' }, Transport.RMQ)
  async updateInventory(
    @Payload()
    payload: {
      requestId?: string;
      products: OrderItemDto[];
    },
    @Ctx() context: RmqContext,
  ): Promise<boolean> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const result = await this.productService.updateInventory(payload);
      channel.ack(originalMsg);
      return result;
    } catch (error) {
      this.retryOrDlq(channel, originalMsg);
      return false;
    }
  }

  @EventPattern({ cmd: 'updateInventoryRequested' }, Transport.RMQ)
  async handleUpdateInventoryRequested(
    @Payload()
    payload: {
      requestId?: string;
      orderId: number;
      customerId: number;
      products: OrderItemDto[];
      totalAmount: number;
    },
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.productService.handleUpdateInventoryRequested(payload);
      channel.ack(originalMsg);
    } catch (error) {
      this.retryOrDlq(channel, originalMsg);
    }
  }

  private retryOrDlq(channel: any, originalMsg: any): void {
    const headers = (originalMsg?.properties?.headers ?? {}) as Record<
      string,
      unknown
    >;
    const rawRetryCount = headers['x-retry-count'];
    const retryCount = Number(rawRetryCount ?? 0);

    if (!Number.isFinite(retryCount) || retryCount >= 5) {
      channel.nack(originalMsg, false, false);
      return;
    }

    const nextHeaders = {
      ...headers,
      'x-retry-count': retryCount + 1,
    };

    channel.sendToQueue(originalMsg.fields.routingKey, originalMsg.content, {
      ...originalMsg.properties,
      headers: nextHeaders,
    });
    channel.ack(originalMsg);
  }
}
