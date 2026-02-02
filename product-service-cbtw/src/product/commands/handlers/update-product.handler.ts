import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductEntity } from '../../../entities';
import { UpdateProductCommand } from '../impl';

@CommandHandler(UpdateProductCommand)
export class UpdateProductCommandHandler implements ICommandHandler<UpdateProductCommand> {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly productRepository: Repository<ProductEntity>,
  ) {}

  async execute({
    productData,
    productId,
  }: UpdateProductCommand): Promise<ProductEntity> {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new Error(`Product with id ${productId} not found.`);
    }
    Object.assign(product, productData);
    return this.productRepository.save(product);
  }
}
