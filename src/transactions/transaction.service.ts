import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TransactionDto } from './dto/transactions.dto';
import { Transaction, TransactionType } from './transaction.entity';
import { Wallet } from 'src/wallets/wallet.entity';

@Injectable()
export class TransactionService {
  constructor(private readonly dataSource: DataSource) {}

  async transfer(transactionDto: TransactionDto): Promise<Transaction> {
    //ensure the wallets are not the same
    if (transactionDto.sourceWalletId === transactionDto.destinationWalletId) {
      throw new BadRequestException(
        'The source and destination wallets should be different',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const sourceWallet = await queryRunner.manager.findOne(Wallet, {
        where: { id: transactionDto.sourceWalletId },
      });

      if (!sourceWallet) {
        throw new NotFoundException('Source wallet not found');
      }

      const destinationWallet = await queryRunner.manager.findOne(Wallet, {
        where: { id: transactionDto.destinationWalletId },
      });

      if (!destinationWallet) {
        throw new NotFoundException('Destination wallet not found');
      }

      if (sourceWallet.balance < transactionDto.amount) {
        throw new HttpException(
          { error: 'INSUFFICIENT_FUNDS', message: 'Try a lower amount' },
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      sourceWallet.balance = sourceWallet.balance - transactionDto.amount;
      const savedSourceWallet = await queryRunner.manager.save(sourceWallet);

      destinationWallet.balance =
        destinationWallet.balance + transactionDto.amount;
      const savedDestinationWallet =
        await queryRunner.manager.save(destinationWallet);

      const transaction = queryRunner.manager.create(Transaction, {
        type: TransactionType.TRANSFER,
        amount: transactionDto.amount,
        sourceWallet: savedSourceWallet,
        destinationWallet: savedDestinationWallet,
      });
      const savedTransaction = await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();

      return savedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findOne(id: string): Promise<Transaction> {
    const transaction = await this.dataSource
      .getRepository(Transaction)
      .findOne({
        where: { id },
        relations: {
          sourceWallet: true,
          destinationWallet: true,
        },
      });

    if (!transaction) {
      throw new NotFoundException('Transaction not Found');
    }

    return transaction;
  }
}
