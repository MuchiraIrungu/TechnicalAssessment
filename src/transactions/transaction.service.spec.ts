import { Test, TestingModule } from '@nestjs/testing';
import { TransactionService } from './transaction.service';
import { DataSource } from 'typeorm';
import { HttpException } from '@nestjs/common';

const testQueryRunner = {
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  manager: {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  },
};

const testDataSource = {
  createQueryRunner: jest.fn().mockReturnValue(testQueryRunner),
};

describe('TransactionService', () => {
  let service: TransactionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        { provide: DataSource, useValue: testDataSource },
      ],
    }).compile();
    service = module.get<TransactionService>(TransactionService);

    jest.clearAllMocks();
  });

  describe('transfer', () => {
    //// SUCCESS TEST ////
    it('should debit source, credit destination and record transaction', async () => {
      // fake wallets
      const sourceWallet = { id: 'wallet-1', balance: 5000 };
      const destinationWallet = { id: 'wallet-2', balance: 1000 };

      testQueryRunner.manager.findOne
        .mockResolvedValueOnce(sourceWallet)
        .mockResolvedValueOnce(destinationWallet);

      testQueryRunner.manager.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      //return a fake transaction object
      testQueryRunner.manager.create.mockReturnValue({
        id: 'tnx-1',
        type: 'TRANSFER',
        amount: 2000,
        sourceWallet,
        destinationWallet,
      });

      //run transfer
      const result = await service.transfer({
        sourceWalletId: 'wallet-1',
        destinationWalletId: 'wallet-2',
        amount: 2000,
      });

      //verify account changes were successful
      expect(sourceWallet.balance).toBe(3000);
      expect(destinationWallet.balance).toBe(3000);
      expect(testQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(result.type).toBe('TRANSFER');
    });

    //// INSUFFICIENT FUNDS TEST ////
    it('should fail, since source has insufficient funds', async () => {
      const sourceWallet = { id: 'wallet-1', balance: 500 };
      const destinationWallet = { id: 'wallet-2', balance: 1000 };

      testQueryRunner.manager.findOne
        .mockResolvedValueOnce(sourceWallet)
        .mockResolvedValueOnce(destinationWallet);

      testQueryRunner.manager.save.mockImplementation((entity) =>
        Promise.resolve(entity),
      );

      testQueryRunner.manager.create.mockReturnValue({
        id: 'tnx-2',
        type: 'TRANSFER',
        amount: 2000,
        sourceWallet,
        destinationWallet,
      });

      //run transfer
      await expect(
        service.transfer({
          sourceWalletId: 'wallet-1',
          destinationWalletId: 'wallet-2',
          amount: 2000,
        }),
      ).rejects.toThrow(HttpException);

      //test transaction success
      expect(sourceWallet.balance).toBe(500);
      expect(destinationWallet.balance).toBe(1000);
      expect(testQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(testQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    //// ROLLBACK TEST ///
    it('should rollback is a crash occurs', async () => {
      const sourceWallet = { id: 'wallet-1', balance: 5000 };
      const destinationWallet = { id: 'wallet-2', balance: 1000 };

      testQueryRunner.manager.findOne
        .mockResolvedValueOnce(sourceWallet)
        .mockResolvedValueOnce(destinationWallet);

      testQueryRunner.manager.save
        .mockResolvedValueOnce(sourceWallet)
        .mockResolvedValueOnce(destinationWallet)
        .mockRejectedValueOnce(new Error('Database crash'));

      testQueryRunner.manager.create.mockReturnValue({
        id: 'tnx-3',
        type: 'TRANSFER',
        amount: 2000,
        sourceWallet,
        destinationWallet,
      });

      await expect(
        service.transfer({
          sourceWalletId: 'wallet-1',
          destinationWalletId: 'wallet-2',
          amount: 2000,
        }),
      ).rejects.toThrow(Error);

      //test rollback
      expect(testQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(testQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(testQueryRunner.manager.save).toHaveBeenCalledTimes(3);
    });
  });
});
