import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('order_requests')
export class OrderRequestEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  requestId: string;

  @Column({ type: 'varchar', length: 32 })
  status:
    | 'processing'
    | 'order_created'
    | 'customer_validated'
    | 'customer_invalidated'
    | 'stock_reserved'
    | 'stock_not_available'
    | 'order_confirmed'
    | 'order_cancelled';

  @Column({ type: 'int', nullable: true })
  orderId?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
