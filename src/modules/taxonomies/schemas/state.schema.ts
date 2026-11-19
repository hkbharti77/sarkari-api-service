import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type StateDocument = State & Document;

@Schema({ timestamps: true })
export class State {
  @ApiProperty({ example: 'UP' })
  @Prop({ required: true, unique: true, uppercase: true, index: true })
  code: string;

  @ApiProperty({ example: 'Uttar Pradesh' })
  @Prop({ required: true, trim: true })
  name: string;

  @ApiProperty({ example: 'uttar-pradesh' })
  @Prop({ required: true, unique: true, lowercase: true, index: true })
  slug: string;

  @ApiProperty({ example: 'Hindi' })
  @Prop({ required: true, default: 'Hindi' })
  regionalLanguage: string;

  @ApiProperty({ example: ['UPSSSC', 'UPPSC', 'UPPRPB'] })
  @Prop({ type: [String], default: [] })
  commissions: string[];

  @ApiProperty({ example: 'https://emblem.gov.in/up.png' })
  @Prop()
  emblemUrl?: string;

  @ApiProperty({ example: true })
  @Prop({ default: true })
  isActive: boolean;
}

export const StateSchema = SchemaFactory.createForClass(State);
