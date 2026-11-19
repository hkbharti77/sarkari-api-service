import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type JobDocumentDocument = JobDocument & Document;

@Schema({ timestamps: true, collection: 'job_documents' })
export class JobDocument {
  @Prop({ required: true, index: true })
  jobId: string;

  @Prop({ required: true, trim: true })
  originalFilename: string;

  @Prop({ required: true, trim: true })
  storageKey: string; // S3 Key or local storage path

  @Prop({ required: true, default: 'application/pdf' })
  contentType: string;

  @Prop({ required: true, min: 1 })
  sizeBytes: number;

  @Prop({ required: true })
  checksum: string; // SHA-256 hash for tamper prevention

  @Prop({ required: true })
  uploadedBy: string; // Officer email/ID
}

export const JobDocumentSchema = SchemaFactory.createForClass(JobDocument);

JobDocumentSchema.index({ jobId: 1, createdAt: -1 });
