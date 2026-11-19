import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  @ApiProperty({ example: 'SSC' })
  @Prop({ required: true, trim: true })
  name: string;

  @ApiProperty({ example: 'ssc' })
  @Prop({ required: true, unique: true, lowercase: true, index: true })
  slug: string;

  @ApiProperty({ example: 'Staff Selection Commission examinations for central posts' })
  @Prop()
  description?: string;

  @ApiProperty({ example: 'assignment_turned_in' })
  @Prop()
  iconName?: string;

  @ApiProperty({ example: 1 })
  @Prop({ default: 0 })
  sortOrder: number;

  @ApiProperty({ example: true })
  @Prop({ default: true })
  isActive: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
