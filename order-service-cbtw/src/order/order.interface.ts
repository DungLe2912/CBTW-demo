import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class PlaceOrderDto {
  @IsOptional()
  @IsString()
  requestId?: string;

  @IsNotEmpty()
  customerId: number;

  @IsNotEmpty()
  items: OrderItemDto[];
}

export class OrderItemDto {
  @IsNotEmpty()
  @IsNumber()
  productId: number;

  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @IsNotEmpty()
  @IsNumber()
  price: number;
}

export interface ICreateOrderEvent {
  requestId: string;
  orderId: number;
  customerId: number;
  products: OrderItemDto[];
  totalAmount: number;
}
