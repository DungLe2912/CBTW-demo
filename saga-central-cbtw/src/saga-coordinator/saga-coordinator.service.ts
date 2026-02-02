import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import {
  ICreateOrderEvent,
  IProcessPaymentEvent,
  IUpdateInventoryEvent,
  PlaceOrderDto,
} from './saga.interface';

@Injectable()
export class SagaCoordinatorService {
  private readonly acceptedRequests = new Map<
    string,
    {
      requestId: string;
      status:
        | 'processing'
        | 'order_created'
        | 'customer_validated'
        | 'customer_invalidated'
        | 'stock_reserved'
        | 'stock_not_available'
        | 'order_confirmed'
        | 'order_cancelled';
      orderId?: number;
    }
  >();
  private readonly processedEvents = new Set<string>();

  constructor(
    @Inject('orderService') private readonly orderService: ClientProxy,
    @Inject('customerService') private readonly customerService: ClientProxy,
    @Inject('productService') private readonly productService: ClientProxy,
    @Inject('sagaService') private readonly sagaService: ClientProxy,
  ) {
    void this.orderService.connect().catch((error) => Logger.debug(error));
    void this.customerService.connect().catch((error) => Logger.debug(error));
    void this.productService.connect().catch((error) => Logger.debug(error));
    void this.sagaService.connect().catch((error) => Logger.debug(error));
  }

  handleCreateOrder(placeOrderDto: PlaceOrderDto) {
    const requestId = placeOrderDto.requestId ?? randomUUID();
    const existing = this.acceptedRequests.get(requestId);
    if (existing) {
      return existing;
    }

    try {
      const payload = {
        ...placeOrderDto,
        requestId,
      };

      this.orderService.emit({ cmd: 'orderCreateRequested' }, payload);

      const response = { requestId, status: 'processing' as const };
      this.acceptedRequests.set(requestId, response);

      return response;
    } catch (error) {
      Logger.debug('handleCreateOrder:error');
      Logger.debug(error);
    }
  }

  getRequestStatus(requestId: string) {
    return (
      this.acceptedRequests.get(requestId) ?? {
        requestId,
        status: 'processing' as const,
      }
    );
  }

  processOrderCreated({
    requestId,
    customerId,
    orderId,
    products,
    totalAmount,
  }: ICreateOrderEvent): void {
    if (!this.markEventOnce('orderCreated', requestId ?? String(orderId))) {
      return;
    }

    this.updateRequestStatus(requestId, 'order_created', orderId);

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

  processCustomerValidated({
    requestId,
    orderId,
    customerId,
    products,
    totalAmount,
  }: IProcessPaymentEvent): void {
    if (
      !this.markEventOnce('customerValidated', requestId ?? String(orderId))
    ) {
      return;
    }

    this.updateRequestStatus(requestId, 'customer_validated', orderId);

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

  processCustomerInvalidated(orderId: number, requestId?: string): void {
    if (
      !this.markEventOnce('customerInvalidated', requestId ?? String(orderId))
    ) {
      return;
    }

    this.updateRequestStatus(requestId, 'customer_invalidated', orderId);
    Logger.verbose('processCustomerInvalidated');
    this.orderService.emit({ cmd: 'orderCancelled' }, { orderId });
    this.updateRequestStatus(requestId, 'order_cancelled', orderId);
  }

  processStockReserved({ requestId, orderId }: IUpdateInventoryEvent): void {
    if (!this.markEventOnce('stockReserved', requestId ?? String(orderId))) {
      return;
    }

    this.updateRequestStatus(requestId, 'stock_reserved', orderId);
    this.orderService.emit({ cmd: 'orderConfirmed' }, { orderId });
    this.updateRequestStatus(requestId, 'order_confirmed', orderId);
  }

  processStockNotAvailable({
    requestId,
    orderId,
    customerId,
    totalAmount,
  }: IUpdateInventoryEvent): void {
    if (
      !this.markEventOnce('stockNotAvailable', requestId ?? String(orderId))
    ) {
      return;
    }
    console.log('processStockNotAvailable called');
    this.updateRequestStatus(requestId, 'stock_not_available', orderId);
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
    this.updateRequestStatus(requestId, 'order_cancelled', orderId);
  }

  private markEventOnce(event: string, key: string): boolean {
    const id = `${event}:${key}`;
    if (this.processedEvents.has(id)) {
      return false;
    }
    this.processedEvents.add(id);
    return true;
  }

  private updateRequestStatus(
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

    const current = this.acceptedRequests.get(requestId) ?? {
      requestId,
      status: 'processing' as const,
    };

    this.acceptedRequests.set(requestId, {
      ...current,
      status,
      orderId: orderId ?? current.orderId,
    });
  }
}
