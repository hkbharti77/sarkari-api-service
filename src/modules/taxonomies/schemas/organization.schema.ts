import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type OrganizationDocument = Organization & Document;

export enum OrganizationType {
  CENTRAL = 'CENTRAL',
  STATE = 'STATE',
  DEFENCE = 'DEFENCE',
  BANKING = 'BANKING',
  OTHER = 'OTHER',
}

@Schema({ timestamps: true })
export class Organization {
  @ApiProperty({ example: 'Staff Selection Commission' })
  @Prop({ required: true, trim: true })
  name: string;

  @ApiProperty({ example: 'SSC' })
  @Prop({ required: true, uppercase: true, index: true })
  shortName: string;

  @ApiProperty({ example: 'ssc' })
  @Prop({ required: true, unique: true, lowercase: true, index: true })
  slug: string;

  @ApiProperty({ enum: OrganizationType, example: OrganizationType.CENTRAL })
  @Prop({ required: true, enum: OrganizationType, default: OrganizationType.CENTRAL })
  organizationType: OrganizationType;

  @ApiProperty({ example: 'Government of India' })
  @Prop({ required: true })
  jurisdiction: string;

  @ApiProperty({ example: 'https://ssc.gov.in' })
  @Prop({ required: true })
  officialWebsite: string;

  @ApiProperty({ example: 'https://lh3.googleusercontent.com/...' })
  @Prop()
  logoUrl?: string;

  @ApiProperty({ example: true })
  @Prop({ default: true })
  isActive: boolean;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
