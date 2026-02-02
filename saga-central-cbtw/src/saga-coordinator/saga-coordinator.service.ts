import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import {
  ICreateOrderEvent,
  IProcessPaymentEvent,
  IUpdateInventoryEvent,
  PlaceOrderDto,
} from './saga.interface';
import { OrderRequestEntity } from '../entities/order-request.entity';

@Injectable()
export class SagaCoordinatorService {
  private readonly processedEvents = new Set<string>();

  constructor(
    @Inject('orderService') private readonly orderService: ClientProxy,
    @Inject('customerService') private readonly customerService: ClientProxy,
    @Inject('productService') private readonly productService: ClientProxy,
    @Inject('sagaService') private readonly sagaService: ClientProxy,
    @InjectRepository(OrderRequestEntity)
    private readonly orderRequestRepository: Repository<OrderRequestEntity>,
  ) {
    void this.orderService.connect().catch((error) => Logger.debug(error));
    void this.customerService.connect().catch((error) => Logger.debug(error));
    void this.productService.connect().catch((error) => Logger.debug(error));
    void this.sagaService.connect().catch((error) => Logger.debug(error));
  }

  async handleCreateOrder(placeOrderDto: PlaceOrderDto) {
    const requestId = placeOrderDto.requestId ?? randomUUID();
    const existingDb = await this.orderRequestRepository.findOne({
      where: { requestId },
    });
    if (existingDb) {
      const response = {
        requestId,
        status: existingDb.status,
        orderId: existingDb.orderId ?? undefined,
      };
      return response;
    }

    try {
      const payload = {
        ...placeOrderDto,
        requestId,
      };

      this.orderService.emit({ cmd: 'orderCreateRequested' }, payload);

      const response = { requestId, status: 'processing' as const };
      await this.orderRequestRepository.save({
        requestId,
        status: 'processing',
      });

      return response;
    } catch (error) {
      Logger.debug('handleCreateOrder:error');
      Logger.debug(error);
    }
  }

  async getRequestStatus(requestId: string) {
    const existingDb = await this.orderRequestRepository.findOne({
      where: { requestId },
    });
    if (!existingDb) {
      return { requestId, status: 'processing' as const };
    }

    const response = {
      requestId,
      status: existingDb.status,
      orderId: existingDb.orderId ?? undefined,
    };
    return response;
  }

  async processOrderCreated({
    requestId,
    customerId,
    orderId,
    products,
    totalAmount,
  }: ICreateOrderEvent): Promise<void> {
    if (!this.markEventOnce('orderCreated', requestId ?? String(orderId))) {
      return;
    }

    await this.updateRequestStatus(requestId, 'order_created', orderId);

    try {
      this.customerService.emit(
        { cmd: 'processPaymentRequested' },
        {
          requestId,
          orderId,
          customerId,
          products,
          totalAmount,
        },
      );
    } catch (error) {
      Logger.debug('processOrderCreated:error');
      Logger.debug(error);
    }
  }

  async processCustomerValidated({
    requestId,
    orderId,
    customerId,
    products,
    totalAmount,
  }: IProcessPaymentEvent): Promise<void> {
    if (
      !this.markEventOnce('customerValidated', requestId ?? String(orderId))
    ) {
      return;
    }

    await this.updateRequestStatus(requestId, 'customer_validated', orderId);

    try {
      this.productService.emit(
        { cmd: 'updateInventoryRequested' },
        {
          requestId,
          orderId,
          customerId,
          products,
          totalAmount,
        },
      );
    } catch (error) {
      Logger.debug('processStockReserved:error');
      Logger.debug(error);
    }
  }

  async processCustomerInvalidated(
    orderId: number,
    requestId?: string,
  ): Promise<void> {
    if (
      !this.markEventOnce('customerInvalidated', requestId ?? String(orderId))
    ) {
      return;
    }

    await this.updateRequestStatus(requestId, 'customer_invalidated', orderId);
    Logger.verbose('processCustomerInvalidated');
    this.orderService.emit({ cmd: 'orderCancelled' }, { orderId });
    await this.updateRequestStatus(requestId, 'order_cancelled', orderId);
  }

  async processStockReserved({
    requestId,
    orderId,
  }: IUpdateInventoryEvent): Promise<void> {
    if (!this.markEventOnce('stockReserved', requestId ?? String(orderId))) {
      return;
    }

    await this.updateRequestStatus(requestId, 'stock_reserved', orderId);
    this.orderService.emit({ cmd: 'orderConfirmed' }, { orderId });
    await this.updateRequestStatus(requestId, 'order_confirmed', orderId);
  }

  async processStockNotAvailable({
    requestId,
    orderId,
    customerId,
    totalAmount,
  }: IUpdateInventoryEvent): Promise<void> {
    if (
      !this.markEventOnce('stockNotAvailable', requestId ?? String(orderId))
    ) {
      return;
    }
    console.log('processStockNotAvailable called');
    await this.updateRequestStatus(requestId, 'stock_not_available', orderId);
    this.customerService.emit(
      { cmd: 'refundPayment' },
      {
        requestId,
        customerId,
        totalAmount,
      },
    );
    console.log('Refund payment emitted');

    this.orderService.emit({ cmd: 'orderCancelled' }, { orderId });
    await this.updateRequestStatus(requestId, 'order_cancelled', orderId);
  }

  private markEventOnce(event: string, key: string): boolean {
    const id = `${event}:${key}`;
    if (this.processedEvents.has(id)) {
      return false;
    }
    this.processedEvents.add(id);
    return true;
  }

  private async updateRequestStatus(
    requestId: string | undefined,
    status:
      | 'processing'
      | 'order_created'
      | 'customer_validated'
      | 'customer_invalidated'
      | 'stock_reserved'
      | 'stock_not_available'
      | 'order_confirmed'
      | 'order_cancelled',
    orderId?: number,
  ) {
    if (!requestId) {
      return;
    }

    await this.orderRequestRepository.update(
      { requestId },
      {
        status,
        orderId: orderId ?? undefined,
      },
    );
  }
}
