import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AlertSubscriptionDocument = AlertSubscription & Document;

export enum AlertChannel {
  WHATSAPP = 'WHATSAPP',
  TELEGRAM = 'TELEGRAM',
  EMAIL = 'EMAIL',
}

@Schema({ timestamps: true, collection: 'alert_subscriptions' })
export class AlertSubscription {
  @Prop({ required: true, trim: true, lowercase: true, index: true })
  contactInfo: string; // Email address or mobile phone number

  @Prop({ required: true, enum: AlertChannel })
  channel: AlertChannel;

  @Prop({ default: 'ALL', trim: true, uppercase: true })
  stateFilter: string; // e.g. "UP", "BR", "ALL"

  @Prop({ default: 'ALL', trim: true, uppercase: true })
  agencyFilter: string; // e.g. "SSC", "RRB", "ALL"

  @Prop({ default: true })
  isActive: boolean;
}

export const AlertSubscriptionSchema = SchemaFactory.createForClass(AlertSubscription);

AlertSubscriptionSchema.index({ contactInfo: 1, channel: 1 }, { unique: true });
AlertSubscriptionSchema.index({ stateFilter: 1, isActive: 1 });
