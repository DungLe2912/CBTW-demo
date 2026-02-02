import { OrderItemDto } from '../../product.interface';

export class UpdateInventoryCommand {
  constructor(public readonly products: OrderItemDto[]) {}
}
