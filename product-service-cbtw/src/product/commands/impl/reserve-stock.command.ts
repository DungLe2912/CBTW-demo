import { OrderItemDto } from '../../product.interface';

export class ReserveStockCommand {
  constructor(public readonly products: OrderItemDto[]) {}
}
