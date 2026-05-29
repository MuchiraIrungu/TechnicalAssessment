import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionDto } from './dto/transactions.dto';

@Controller('transfers')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  async transfer(@Body() transactionDto: TransactionDto) {
    return this.transactionService.transfer(transactionDto);
  }

  @Get(':id')
  async getTransaction(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.transactionService.findOne(id);
  }
}
