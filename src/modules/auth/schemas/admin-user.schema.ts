import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  PUBLISHER = 'PUBLISHER',
  REVIEWER = 'REVIEWER',
  SCRUTINY_OFFICER = 'SCRUTINY_OFFICER',
  EDITOR = 'EDITOR',
}

export type AdminUserDocument = AdminUser & Document;

@Schema({
  timestamps: true,
  collection: 'admin_users',
})
export class AdminUser {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ type: String, enum: AdminRole, default: AdminRole.EDITOR })
  role: AdminRole;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date, default: null })
  lastLoginAt: Date | null;
}

export const AdminUserSchema = SchemaFactory.createForClass(AdminUser);

// Indexes
AdminUserSchema.index({ role: 1 });
