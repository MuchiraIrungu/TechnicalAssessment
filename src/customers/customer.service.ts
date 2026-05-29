import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Customer } from './customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { Wallet } from 'src/wallets/wallet.entity';

@Injectable()
export class CustomersService {
  constructor(private readonly dataSource: DataSource) {}

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    const normalizedEmail = createCustomerDto.email.toLowerCase();

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const customer = queryRunner.manager.create(Customer, {
        ...createCustomerDto,
        email: normalizedEmail,
      });
      const savedCustomer = await queryRunner.manager.save(customer);

      const wallet = queryRunner.manager.create(Wallet, {
        customer: savedCustomer,
        balance: 0,
      });
      await queryRunner.manager.save(wallet);

      await queryRunner.commitTransaction();

      savedCustomer.wallet = wallet;
      return savedCustomer;
    } catch (error) {
      const err = error as Error;
      await queryRunner.rollbackTransaction();
      if (err.message?.includes('UNIQUE constraint failed')) {
        throw new ConflictException(
          'A customer with this email already exists.',
        );
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.dataSource
      .getRepository(Customer)
      .findOne({ where: { id }, relations: { wallet: true } });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }
}
