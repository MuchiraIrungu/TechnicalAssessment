import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  CreateDateColumn,
} from 'typeorm';
import { Wallet } from '../wallets/wallet.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true })
  email: string;

  @OneToOne(() => Wallet, (wallet) => wallet.customer, {
    cascade: true,
    eager: true,
  })
  wallet: Wallet;

  @CreateDateColumn()
  createdAt: Date;
}
