import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AdminRole } from '../schemas/admin-user.schema';

export class CreateAdminUserDto {
  @ApiProperty({ example: 'Rajesh Kumar', description: 'Full name of the admin user' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'rajesh@govjob.in', description: 'Unique email address' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Admin@1234', description: 'Password (min 8 chars)' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @IsNotEmpty()
  password: string;

  @ApiProperty({ enum: AdminRole, example: AdminRole.EDITOR, description: 'Role assigned to the admin user' })
  @IsEnum(AdminRole, { message: `Role must be one of: ${Object.values(AdminRole).join(', ')}` })
  @IsNotEmpty()
  role: AdminRole;
}
