import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';

import { CustomersService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Controller('customers')
export class CustomerController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  async create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Get('id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.customersService.findOne(id);
  }
}
