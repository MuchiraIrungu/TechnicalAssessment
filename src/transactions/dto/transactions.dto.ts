import { IsInt, IsPositive, IsUUID } from 'class-validator';

export class TransactionDto {
  @IsUUID()
  sourceWalletId: string;

  @IsUUID()
  destinationWalletId: string;

  @IsInt({ message: 'Amount must be a whole number' })
  @IsPositive({ message: 'Amount must be greater that zero' })
  amount: number;
}
