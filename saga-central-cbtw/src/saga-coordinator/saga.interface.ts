import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export interface ICreateOrderEvent {
  requestId: string;
  orderId: number;
  customerId: number;
  products: OrderItemDto[];
  totalAmount: number;
}

export interface IProcessPaymentEvent {
  requestId: string;
  orderId: number;
  customerId: number;
  totalAmount: number;
  products: OrderItemDto[];
}

export interface IUpdateInventoryEvent {
  requestId: string;
  orderId: number;
  customerId: number;
  products: OrderItemDto[];
  totalAmount: number;
}

interface OrderItemDto {
  productId: number;
  quantity: number;
  price: number;
}

export class PlaceOrderDto {
  @IsOptional()
  @IsString()
  requestId?: string;

  @IsNotEmpty()
  customerId: number;

  @IsNotEmpty()
  items: OrderItemDto[];
}
