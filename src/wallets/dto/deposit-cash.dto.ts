import { IsInt, IsPositive } from 'class-validator';

export class DepositDto {
  @IsInt({ message: 'Amount must be a whole number' })
  @IsPositive({ message: 'Amount must be greater than zero' })
  amount: number;
}
