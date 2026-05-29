import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Wallet } from '../wallets/wallet.entity';

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  TRANSFER = 'TRANSFER',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'int' })
  amount: number;

  @ManyToOne(() => Wallet, (wallet) => wallet.sentTransactions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'source_wallet_id' })
  sourceWallet: Wallet | null;

  @ManyToOne(() => Wallet, (wallet) => wallet.receivedTransactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'destination_wallet_id' })
  destinationWallet: Wallet;

  @CreateDateColumn()
  createdAt: Date;
}
