## Order Creation Saga (Flow Overview)

```mermaid
sequenceDiagram
  autonumber
  participant Client
  participant Saga as Saga Coordinator
  participant Order as Order Service
  participant Customer as Customer Service
  participant Product as Product Service

  Client->>Saga: POST /orders (PlaceOrderDto)
  note right of Saga: Persist request
  Saga->>Order: orderCreateRequested
  Order-->>Saga: orderCreated (orderId)
  Saga->>Customer: processPaymentRequested

  alt Payment approved
    Customer-->>Saga: customerValidated
    Saga->>Product: updateInventoryRequested
    alt Stock reserved
      Product-->>Saga: stockReserved
      Saga->>Order: orderConfirmed
    else Stock unavailable
      Product-->>Saga: stockNotAvailable
      Saga->>Customer: refundPayment
      Saga->>Order: orderCancelled
    end
  else Payment failed
    Customer-->>Saga: customerInvalidated
    Saga->>Order: orderCancelled
  end
```

### Possible Status Values

- `processing`: Request accepted and in progress.
- `order_created`: Order created by order-service.
- `customer_validated`: Payment approved.
- `customer_invalidated`: Payment failed.
- `stock_reserved`: Inventory reserved.
- `stock_not_available`: Inventory not available.
- `order_confirmed`: Order confirmed.
- `order_cancelled`: Order cancelled.

### Failure & Retry Behavior

- Failed messages are `nack`ed and requeued for retry.
- After 5 retries, messages are `nack`ed without requeue and routed to DLX/DLQ.
- Request state is stored in DB (table `order_requests`) to stay consistent across workers.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```
