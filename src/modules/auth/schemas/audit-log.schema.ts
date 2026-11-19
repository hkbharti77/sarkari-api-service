import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({
  timestamps: false,
  collection: 'audit_logs',
})
export class AuditLog {
  @Prop({ required: true, type: Date, default: () => new Date() })
  timestamp: Date;

  @Prop({ required: true, trim: true })
  actor: string;        // admin email who performed the action

  @Prop({ required: true })
  role: string;         // AdminRole at time of action

  @Prop({ required: true })
  action: string;       // e.g. "CREATE_JOB", "PUBLISH_RESULT", "SCRUTINY_UPDATE"

  @Prop({ default: null })
  referenceId: string;  // ObjectId string of affected document

  @Prop({ default: null })
  statusType: string;   // PipelineStatus or other status at time of action

  @Prop({ type: Object, default: {} })
  metadata: Record<string, unknown>;  // any extra context (IP, diff, etc.)
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Indexes for fast lookup
AuditLogSchema.index({ actor: 1 });
AuditLogSchema.index({ referenceId: 1 });
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ action: 1 });
