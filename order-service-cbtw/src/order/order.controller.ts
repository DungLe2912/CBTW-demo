/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Body, Controller } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  Payload,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import { PlaceOrderDto } from './order.interface';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @EventPattern({ cmd: 'orderCreateRequested' }, Transport.RMQ)
  async handleOrderCreateRequested(
    @Payload() createOrderDto: PlaceOrderDto,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.orderService.handleOrderCreateRequested(createOrderDto);
      channel.ack(originalMsg);
    } catch (error) {
      this.retryOrDlq(channel, originalMsg);
    }
  }

  @EventPattern({ cmd: 'orderConfirmed' }, Transport.RMQ)
  async handleOrderConfirmedEvent(
    @Payload() payload: { orderId: number },
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.orderService.handleOrderConfirmedEvent(payload);
      channel.ack(originalMsg);
    } catch (error) {
      this.retryOrDlq(channel, originalMsg);
    }
  }

  @EventPattern({ cmd: 'orderCancelled' }, Transport.RMQ)
  async handleOrderCancelledEvent(
    @Payload() payload: { orderId: number },
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.orderService.handleOrderCancelledEvent(payload);
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
