import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCustomerDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  name: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}
