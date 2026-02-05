import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { ProcessPaymentCommand } from '../impl';
import { CustomerEntity } from '../../../entities';

@CommandHandler(ProcessPaymentCommand)
export class ProcessPaymentCommandHandler implements ICommandHandler<ProcessPaymentCommand> {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
  ) {}

  async execute({
    customerId,
    totalAmount,
  }: ProcessPaymentCommand): Promise<boolean> {
    Logger.log('Start process payment');
    const result = await this.customerRepository
      .createQueryBuilder()
      .update(CustomerEntity)
      .set({
        balance: () => '"balance" - :amount',
      })
      .where('id = :id', { id: customerId })
      .andWhere('"balance" >= :amount', { amount: totalAmount })
      .execute();

    if (!result.affected) {
      Logger.debug('Cannot process payment');
      return false;
    }

    return true;
  }
}
