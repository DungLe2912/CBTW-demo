import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  EventPattern,
  MessagePattern,
  Payload,
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
  ): Promise<boolean> {
    return await this.customerService.processPayment(payload);
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
  ): Promise<void> {
    await this.customerService.handleProcessPaymentRequested(payload);
  }

  @EventPattern({ cmd: 'refundPayment' }, Transport.RMQ)
  async compensateProcessPayment(
    @Payload()
    payload: {
      requestId?: string;
      customerId: number;
      totalAmount: number;
    },
  ): Promise<boolean> {
    return await this.customerService.compensateProcessPayment(payload);
  }
}
