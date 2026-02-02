import { Body, Controller } from '@nestjs/common';
import { EventPattern, Payload, Transport } from '@nestjs/microservices';
import { PlaceOrderDto } from './order.interface';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @EventPattern({ cmd: 'orderCreateRequested' }, Transport.RMQ)
  async handleOrderCreateRequested(
    @Payload() createOrderDto: PlaceOrderDto,
  ): Promise<void> {
    await this.orderService.handleOrderCreateRequested(createOrderDto);
  }

  @EventPattern({ cmd: 'orderConfirmed' }, Transport.RMQ)
  async handleOrderConfirmedEvent(
    @Payload() payload: { orderId: number },
  ): Promise<void> {
    await this.orderService.handleOrderConfirmedEvent(payload);
  }

  @EventPattern({ cmd: 'orderCancelled' }, Transport.RMQ)
  async handleOrderCancelledEvent(
    @Payload() payload: { orderId: number },
  ): Promise<void> {
    await this.orderService.handleOrderCancelledEvent(payload);
  }
}
