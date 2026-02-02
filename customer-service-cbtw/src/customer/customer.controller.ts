/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
  Transport,
} from '@nestjs/microservices';
import { CreateCustomerDto } from './customer.interface';
import { CustomerService } from './customer.service';

@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  async createCustomer(@Body() createCustomerDto: CreateCustomerDto) {
    const customer =
      await this.customerService.createCustomer(createCustomerDto);

    return { customer };
  }

  @Get(':id')
  async getCustomer(@Param('id') id: number) {
    const customer = await this.customerService.findOne(id);

    return { customer };
  }

  @MessagePattern({ cmd: 'processPayment' }, Transport.RMQ)
  async processPayment(
    @Payload()
    payload: {
      requestId?: string;
      customerId: number;
      totalAmount: number;
    },
    @Ctx() context: RmqContext,
  ): Promise<boolean> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const result = await this.customerService.processPayment(payload);
      channel.ack(originalMsg);
      return result;
    } catch (error) {
      this.retryOrDlq(channel, originalMsg);
      return false;
    }
  }

  @EventPattern({ cmd: 'processPaymentRequested' }, Transport.RMQ)
  async handleProcessPaymentRequested(
    @Payload()
    payload: {
      requestId?: string;
      orderId: number;
      customerId: number;
      products: unknown;
      totalAmount: number;
    },
    @Ctx() context: RmqContext,
  ): Promise<void> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.customerService.handleProcessPaymentRequested(payload);
      channel.ack(originalMsg);
    } catch (error) {
      this.retryOrDlq(channel, originalMsg);
    }
  }

  @EventPattern({ cmd: 'refundPayment' }, Transport.RMQ)
  async compensateProcessPayment(
    @Payload()
    payload: {
      requestId?: string;
      customerId: number;
      totalAmount: number;
    },
    @Ctx() context: RmqContext,
  ): Promise<boolean> {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      const result =
        await this.customerService.compensateProcessPayment(payload);
      channel.ack(originalMsg);
      return result;
    } catch (error) {
      this.retryOrDlq(channel, originalMsg);
      return false;
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
