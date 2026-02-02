/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateOrderCommand } from '../impl';
import { OrderEntity, OrderItemEntity } from '../../../entities';
import { OrderStatus } from '../../order.enum';

@CommandHandler(CreateOrderCommand)
export class CreateOrderCommandHandler implements ICommandHandler<CreateOrderCommand> {
  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItemRepository: Repository<OrderItemEntity>,
  ) {}

  async execute({ placeOrderDto }: CreateOrderCommand): Promise<any> {
    try {
      const { requestId, ...orderData } = placeOrderDto as any;

      const orderEntity = await this.orderRepository.save(
        {
          ...orderData,
          status: OrderStatus.Pending,
        },
        {
          transaction: false,
        },
      );
      await this.orderItemRepository.save(
        orderData.items.map((orderItem) => ({
          ...orderItem,
          order: {
            id: orderEntity.id,
          },
        })),
        {
          transaction: false,
        },
      );

      const totalAmount = orderData.items.reduce(
        (prev, current) => prev + current.price,
        0,
      );

      return {
        requestId,
        orderId: orderEntity.id,
        customerId: orderEntity.customerId,
        products: orderData.items,
        totalAmount,
      };
    } catch (error: any) {
      throw new Error(error);
    }
  }
}
