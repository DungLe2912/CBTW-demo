import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';

import { CustomerEntity } from '../../../entities';
import { CompensateProcessPaymentCommand } from '../impl';

@CommandHandler(CompensateProcessPaymentCommand)
export class CompensateProcessPaymentCommandHandler implements ICommandHandler<CompensateProcessPaymentCommand> {
  constructor(
    @InjectRepository(CustomerEntity)
    private readonly customerRepository: Repository<CustomerEntity>,
  ) {}

  async execute({
    customerId,
    totalAmount,
  }: CompensateProcessPaymentCommand): Promise<boolean> {
    Logger.debug('Start compensation process payment');
    const result = await this.customerRepository.increment(
      { id: customerId },
      'balance',
      totalAmount,
    );

    if (!result.affected) {
      Logger.debug(`Customer not found for id: ${customerId}`);
      return false;
    }

    return true;
  }
}
