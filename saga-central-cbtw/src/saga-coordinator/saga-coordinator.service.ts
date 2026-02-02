import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
  ICreateOrderEvent,
  IProcessPaymentEvent,
  IUpdateInventoryEvent,
  PlaceOrderDto,
} from './saga.interface';

@Injectable()
export class SagaCoordinatorService {
  constructor(
    @Inject('orderService') private readonly orderService: ClientProxy,
    @Inject('customerService') private readonly customerService: ClientProxy,
    @Inject('productService') private readonly productService: ClientProxy,
    @Inject('sagaService') private readonly sagaService: ClientProxy,
  ) {
    void this.orderService.connect().catch((error) => Logger.error(error));
    void this.customerService.connect().catch((error) => Logger.error(error));
    void this.productService.connect().catch((error) => Logger.error(error));
    void this.sagaService.connect().catch((error) => Logger.error(error));
  }

  async handleCreateOrder(placeOrderDto: PlaceOrderDto) {
    try {
      const order = await firstValueFrom(
        this.orderService.send<ICreateOrderEvent>(
          { cmd: 'createOrder' },
          placeOrderDto,
        ),
      );
      if (order) {
        this.sagaService.emit({ cmd: 'orderCreated' }, order);
      }

      return order;
    } catch (error) {
      Logger.error('handleCreateOrder:error');
      Logger.error(error);
    }
  }

  async processOrderCreated({
    customerId,
    orderId,
    products,
    totalAmount,
  }: ICreateOrderEvent): Promise<void> {
    try {
      const isPay = await firstValueFrom(
        this.customerService.send<boolean>(
          { cmd: 'processPayment' },
          {
            customerId,
            totalAmount,
          },
        ),
      );

      if (isPay) {
        this.sagaService.emit(
          { cmd: 'customerValidated' },
          { orderId, customerId, products, totalAmount },
        );
      } else {
        this.sagaService.emit({ cmd: 'customerInvalidated' }, { orderId });
      }
    } catch (error) {
      Logger.error('processOrderCreated:error');
      Logger.error(error);
    }
  }

  async processCustomerValidated({
    orderId,
    customerId,
    products,
    totalAmount,
  }: IProcessPaymentEvent): Promise<void> {
    try {
      const isStockReserve = await firstValueFrom(
        this.productService.send<boolean>(
          { cmd: 'updateInventory' },
          { products },
        ),
      );
      if (isStockReserve) {
        this.orderService.emit({ cmd: 'orderConfirmed' }, { orderId });
      } else {
        this.sagaService.emit(
          { cmd: 'stockNotAvailable' },
          {
            orderId,
            customerId,
            products,
            totalAmount,
          },
        );
      }
    } catch (error) {
      Logger.error('processStockReserved:error');
      Logger.error(error);
    }
  }

  processCustomerInvalidated(orderId: number): void {
    Logger.verbose('processCustomerInvalidated');
    this.orderService.emit({ cmd: 'orderCancelled' }, { orderId });
  }

  async processStockReserved({
    orderId,
    products,
  }: IUpdateInventoryEvent): Promise<void> {
    try {
      const isStockReserve = await firstValueFrom(
        this.productService.send<boolean>(
          { cmd: 'updateInventory' },
          { products },
        ),
      );
      if (isStockReserve) {
        this.orderService.emit({ cmd: 'orderConfirmed' }, { orderId });
      }
    } catch (error) {
      Logger.error('processStockReserved:error');
      Logger.error(error);
    }
  }

  processStockNotAvailable({
    orderId,
    customerId,
    totalAmount,
  }: IUpdateInventoryEvent): void {
    this.customerService.emit(
      { cmd: 'refundPayment' },
      {
        customerId,
        totalAmount,
      },
    );

    this.orderService.emit({ cmd: 'orderCancelled' }, { orderId });
  }
}
