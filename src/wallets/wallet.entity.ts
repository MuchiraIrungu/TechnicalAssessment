import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Customer } from '../customers/customer.entity';
import { Transaction } from '../transactions/transaction.entity';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', default: 0, unsigned: true })
  balance: number;

  @OneToOne(() => Customer, (customer) => customer.wallet, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @OneToMany(() => Transaction, (transaction) => transaction.sourceWallet)
  sentTransactions: Transaction[];

  @OneToMany(() => Transaction, (transaction) => transaction.destinationWallet)
  receivedTransactions: Transaction[];

  @CreateDateColumn()
  createdAt: Date;
}
