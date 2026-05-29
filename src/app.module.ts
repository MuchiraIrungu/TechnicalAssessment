import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './customers/customer.entity';
import { Wallet } from './wallets/wallet.entity';
import { Transaction } from './transactions/transaction.entity';
import 'reflect-metadata';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'db.sqlite',
      entities: [Customer, Wallet, Transaction],
      synchronize: true,
      logging: true,
    }),
    ///CustomersModule,
    //WalletsModule,
    //TransfersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
