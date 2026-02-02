/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { OrderEntity } from '../entities';
import {
  CancelOrderCommand,
  ConfirmOrderCommand,
  CreateOrderCommand,
} from './commands';
import { ICreateOrderEvent, PlaceOrderDto } from './order.interface';
import { FindOneOrderQuery } from './queries';

@Injectable()
export class OrderService {
  private readonly processedCreateOrders = new Map<string, ICreateOrderEvent>();
  private readonly processedOrderEvents = new Set<string>();

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    @Inject('sagaService') private readonly sagaService: ClientProxy,
  ) {}

  async createOrder(placeOrderDto: PlaceOrderDto) {
    return await this.commandBus.execute(new CreateOrderCommand(placeOrderDto));
  }

  async createOrderIdempotent(
    placeOrderDto: PlaceOrderDto,
  ): Promise<ICreateOrderEvent> {
    const requestId = placeOrderDto.requestId;
    if (requestId) {
      const cached = this.processedCreateOrders.get(requestId);
      if (cached) {
        return cached;
      }
    }

    const orderCreated = await this.createOrder(placeOrderDto);
    const event: ICreateOrderEvent = {
      requestId: requestId ?? orderCreated.requestId ?? 'unknown',
      ...orderCreated,
    };

    if (requestId) {
      this.processedCreateOrders.set(requestId, event);
    }

    return event;
  }

  async handleOrderCreateRequested(
    placeOrderDto: PlaceOrderDto,
  ): Promise<void> {
    const event = await this.createOrderIdempotent(placeOrderDto);
    this.sagaService.emit({ cmd: 'orderCreated' }, event);
  }

  async findOne(orderId: number): Promise<OrderEntity> {
    return await this.queryBus.execute(new FindOneOrderQuery(orderId));
  }

  async handleOrderConfirmedEvent(payload: { orderId: number }): Promise<void> {
    if (!this.markOrderEventOnce('orderConfirmed', payload.orderId)) {
      return;
    }

    return await this.commandBus.execute(
      new ConfirmOrderCommand(payload.orderId),
    );
  }

  async handleOrderCancelledEvent(payload: { orderId: number }): Promise<void> {
    if (!this.markOrderEventOnce('orderCancelled', payload.orderId)) {
      return;
    }

    return await this.commandBus.execute(
      new CancelOrderCommand(payload.orderId),
    );
  }

  private markOrderEventOnce(event: string, orderId: number): boolean {
    const key = `${event}:${orderId}`;
    if (this.processedOrderEvents.has(key)) {
      return false;
    }
    this.processedOrderEvents.add(key);
    return true;
  }
}
