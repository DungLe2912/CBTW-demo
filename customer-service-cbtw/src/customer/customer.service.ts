/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CustomerEntity } from '../entities';
import {
  CompensateProcessPaymentCommand,
  CreateCustomerCommand,
  ProcessPaymentCommand,
} from './commands';
import { CreateCustomerDto } from './customer.interface';
import { FindOneCustomerQuery } from './queries';

@Injectable()
export class CustomerService {
  private readonly processedPayments = new Map<string, boolean>();
  private readonly processedRefunds = new Set<string>();

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Inject('sagaService') private readonly sagaService: ClientProxy,
  ) {}

  async findOne(id: number): Promise<CustomerEntity> {
    return await this.queryBus.execute(new FindOneCustomerQuery(id));
  }

  async createCustomer(
    createCustomerDto: CreateCustomerDto,
  ): Promise<CustomerEntity> {
    return await this.commandBus.execute(
      new CreateCustomerCommand(createCustomerDto),
    );
  }

  async processPayment(payload: {
    requestId?: string;
    customerId: number;
    totalAmount: number;
  }): Promise<boolean> {
    if (payload.requestId) {
      const cached = this.processedPayments.get(payload.requestId);
      if (cached !== undefined) {
        return cached;
      }
    }

    const result = await this.commandBus.execute(
      new ProcessPaymentCommand(payload.customerId, payload.totalAmount),
    );

    if (payload.requestId) {
      this.processedPayments.set(payload.requestId, result);
    }

    return result;
  }

  async handleProcessPaymentRequested(payload: {
    requestId?: string;
    orderId: number;
    customerId: number;
    products: unknown;
    totalAmount: number;
  }): Promise<void> {
    const isPay = await this.processPayment({
      requestId: payload.requestId,
      customerId: payload.customerId,
      totalAmount: payload.totalAmount,
    });

    if (isPay) {
      this.sagaService.emit(
        { cmd: 'customerValidated' },
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
        { cmd: 'customerInvalidated' },
        {
          requestId: payload.requestId,
          orderId: payload.orderId,
        },
      );
    }
  }

  async compensateProcessPayment(payload: {
    requestId?: string;
    customerId: number;
    totalAmount: number;
  }): Promise<boolean> {
    console.log('compensateProcessPayment called');
    if (payload.requestId) {
      if (this.processedRefunds.has(payload.requestId)) {
        return true;
      }
    }

    const result = await this.commandBus.execute(
      new CompensateProcessPaymentCommand(
        payload.customerId,
        payload.totalAmount,
      ),
    );

    if (payload.requestId) {
      this.processedRefunds.add(payload.requestId);
    }

    return result;
  }
}
