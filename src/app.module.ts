import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './customers/customer.entity';
import { Wallet } from './wallets/wallet.entity';
import { Transaction } from './transactions/transaction.entity';
import 'reflect-metadata';
import { CustomersModule } from './customers/customer.module';
import { TransactionModule } from './transactions/transaction.module';
import { WalletsModule } from './wallets/wallets.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'db.sqlite',
      entities: [Customer, Wallet, Transaction],
      synchronize: true,
      logging: true,
    }),
    CustomersModule,
    WalletsModule,
    TransactionModule,
  ],
})
export class AppModule {}
