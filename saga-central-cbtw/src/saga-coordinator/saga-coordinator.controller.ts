// saga-coordinator.controller.ts

import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { EventPattern, Payload, Transport } from '@nestjs/microservices';
import { SagaCoordinatorService } from './saga-coordinator.service';
import type {
  ICreateOrderEvent,
  IProcessPaymentEvent,
  IUpdateInventoryEvent,
  PlaceOrderDto,
} from './saga.interface';

@Controller()
export class SagaCoordinatorController {
  constructor(
    private readonly sagaCoordinatorService: SagaCoordinatorService,
  ) {}

  @Post('/orders')
  @HttpCode(201)
  createOrder(@Body() createOrderDto: PlaceOrderDto) {
    return this.sagaCoordinatorService.handleCreateOrder(createOrderDto);
  }

  @Get('/orders/:requestId')
  getOrderRequestStatus(@Param('requestId') requestId: string) {
    return this.sagaCoordinatorService.getRequestStatus(requestId);
  }

  @EventPattern({ cmd: 'orderCreated' }, Transport.RMQ)
  handleOrderCreated(@Payload() payload: ICreateOrderEvent): void {
    this.sagaCoordinatorService.processOrderCreated(payload);
  }

  @EventPattern({ cmd: 'customerValidated' }, Transport.RMQ)
  handleCustomerValidated(@Payload() payload: IProcessPaymentEvent): void {
    this.sagaCoordinatorService.processCustomerValidated(payload);
  }

  @EventPattern({ cmd: 'customerInvalidated' }, Transport.RMQ)
  handleCustomerInvalidated(@Payload() payload: IProcessPaymentEvent): void {
    this.sagaCoordinatorService.processCustomerInvalidated(
      payload.orderId,
      payload.requestId,
    );
  }

  @EventPattern({ cmd: 'stockReserved' }, Transport.RMQ)
  handleStockReserved(@Payload() payload: IUpdateInventoryEvent): void {
    this.sagaCoordinatorService.processStockReserved(payload);
  }

  @EventPattern({ cmd: 'stockNotAvailable' }, Transport.RMQ)
  handleStockNotAvailable(@Payload() payload: IUpdateInventoryEvent): void {
    this.sagaCoordinatorService.processStockNotAvailable(payload);
  }
}
