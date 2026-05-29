import {
  Injectable,
  //ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DepositDto } from 'src/dto/deposit-cash.dto';
import { DataSource } from 'typeorm';
import { Wallet } from './wallet.entity';
import {
  Transaction,
  TransactionType,
} from 'src/transactions/transaction.entity';

@Injectable()
export class WalletService {
  constructor(private readonly dataSource: DataSource) {}

  async deposit(id: string, depositDto: DepositDto): Promise<Wallet> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { id },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      wallet.balance = wallet.balance + depositDto.amount;
      const savedWallet = await queryRunner.manager.save(wallet);

      const transaction = queryRunner.manager.create(Transaction, {
        type: TransactionType.DEPOSIT,
        amount: depositDto.amount,
        sourceWallet: null,
        destinationWallet: savedWallet,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      return savedWallet;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findMany(
    id: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: Transaction[]; total: number }> {
    const wallet = await this.dataSource
      .getRepository(Wallet)
      .findOne({ where: { id } });

    if (!wallet) {
      throw new NotFoundException('Wallet Not Found');
    }

    const [data, total] = await this.dataSource
      .getRepository(Transaction)
      .findAndCount({
        where: [{ sourceWallet: true }, { destinationWallet: true }],
        relations: {
          sourceWallet: true,
          destinationWallet: true,
        },
        order: { createdAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });
    return { data, total };
  }
}
