/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// saga-coordinator.controller.ts

import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  Payload,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import { SagaCoordinatorService } from './saga-coordinator.service';
import type {
  ICreateOrderEvent,
  IProcessPaymentEvent,
  IUpdateInventoryEvent,
  PlaceOrderDto,
} from './saga.interface';
import { ConfigService } from '@nestjs/config';

@Controller()
export class SagaCoordinatorController {
  constructor(
    private readonly sagaCoordinatorService: SagaCoordinatorService,
    private configService: ConfigService,
  ) {}

  @Post('/orders')
  @HttpCode(201)
  async createOrder(@Body() createOrderDto: PlaceOrderDto) {
    return await this.sagaCoordinatorService.handleCreateOrder(createOrderDto);
  }

  @Get('/orders/:requestId')
  async getOrderRequestStatus(@Param('requestId') requestId: string) {
    return await this.sagaCoordinatorService.getRequestStatus(requestId);
  }

  @EventPattern({ cmd: 'orderCreated' }, Transport.RMQ)
  async handleOrderCreated(
    @Payload() payload: ICreateOrderEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      await this.sagaCoordinatorService.processOrderCreated(payload);
      channel.ack(originalMsg);
    } catch (error) {
      console.log('Error processing orderCreated event:', error);
      this.retryOrDlq(channel, originalMsg);
    }
  }

  @EventPattern({ cmd: 'customerValidated' }, Transport.RMQ)
  async handleCustomerValidated(
    @Payload() payload: IProcessPaymentEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.sagaCoordinatorService.processCustomerValidated(payload);
      channel.ack(originalMsg);
    } catch (error) {
      this.retryOrDlq(channel, originalMsg);
    }
  }

  @EventPattern({ cmd: 'customerInvalidated' }, Transport.RMQ)
  async handleCustomerInvalidated(
    @Payload() payload: IProcessPaymentEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.sagaCoordinatorService.processCustomerInvalidated(
        payload.orderId,
        payload.requestId,
      );
      channel.ack(originalMsg);
    } catch (error) {
      this.retryOrDlq(channel, originalMsg);
    }
  }

  @EventPattern({ cmd: 'stockReserved' }, Transport.RMQ)
  async handleStockReserved(
    @Payload() payload: IUpdateInventoryEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.sagaCoordinatorService.processStockReserved(payload);
      channel.ack(originalMsg);
    } catch (error) {
      this.retryOrDlq(channel, originalMsg);
    }
  }

  @EventPattern({ cmd: 'stockNotAvailable' }, Transport.RMQ)
  async handleStockNotAvailable(
    @Payload() payload: IUpdateInventoryEvent,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.sagaCoordinatorService.processStockNotAvailable(payload);
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
