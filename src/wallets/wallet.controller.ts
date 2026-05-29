import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { DepositDto } from 'src/wallets/dto/deposit-cash.dto';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post(':id/deposit')
  async deposit(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() depositDto: DepositDto,
  ) {
    return this.walletService.deposit(id, depositDto);
  }

  @Get(':id/transactions')
  async getTransactions(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.walletService.findMany(id, page, limit);
  }
}
