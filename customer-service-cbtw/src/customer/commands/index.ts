import {
  CompensateProcessPaymentCommandHandler,
  CreateCustomerCommandHandler,
  ProcessPaymentCommandHandler,
} from './handlers';

export * from './handlers';
export * from './impl';

export const CommandHandlers = [
  CreateCustomerCommandHandler,
  ProcessPaymentCommandHandler,
  CompensateProcessPaymentCommandHandler,
];
