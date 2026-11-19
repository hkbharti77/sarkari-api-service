import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { CandidateDocuments, CandidateDocumentsSchema } from './candidate-documents.schema';
import { PipelineStatus, PIPELINE_STATUS_VALUES } from '../../jobs/schemas/job.schema';

export type ReservationCategory = 'UR' | 'OBC' | 'SC' | 'ST' | 'EWS';

export const RESERVATION_CATEGORIES: ReservationCategory[] = [
  'UR', 'OBC', 'SC', 'ST', 'EWS',
];

export type CandidateDossierDocument = CandidateDossier & Document;

@Schema({
  timestamps: true,
  collection: 'candidate_dossiers',
})
export class CandidateDossier {
  /** Unique hall-ticket / roll number — e.g. "2608119402" */
  @Prop({ required: true, unique: true, index: true, trim: true })
  rollNumber: string;

  /** System-generated registration identifier — e.g. "REG-2026-88412" */
  @Prop({ required: true, unique: true, index: true, trim: true })
  registrationId: string;

  /** Candidate's full legal name */
  @Prop({ required: true, trim: true })
  fullName: string;

  /** Date of birth — "YYYY-MM-DD" */
  @Prop({ required: true })
  dateOfBirth: string;

  /** Age in years at time of application */
  @Prop({ required: true, min: 1, max: 100 })
  ageYears: number;

  /** Reservation category */
  @Prop({
    required: true,
    enum: RESERVATION_CATEGORIES,
    index: true,
  })
  category: ReservationCategory;

  /** Links dossier to a Job's customId — e.g. "UPSC-CSE-2026-01" */
  @Prop({ required: true, index: true, trim: true })
  appliedAdvtId: string;

  /** Post name the candidate applied for */
  @Prop({ required: true, trim: true })
  appliedPost: string;

  /** Recruiting department name */
  @Prop({ required: true, trim: true })
  department: string;

  /** Exam centre allocation code — e.g. "DEL-NORTH-014" */
  @Prop({ required: true, trim: true })
  examCenterCode: string;

  /** Written/objective score (populated after exam) */
  @Prop({ type: Number, default: null })
  writtenScore: number | null;

  /** Pipeline status — mirrors Job.status values exactly */
  @Prop({
    required: true,
    enum: PIPELINE_STATUS_VALUES,
    default: 'Pending / Scrutiny',
    index: true,
  })
  status: PipelineStatus;

  /** ISO string timestamp of original application submission */
  @Prop({ required: true })
  submittedAt: string;

  /** 5-point document checklist */
  @Prop({ type: CandidateDocumentsSchema, required: true })
  documents: CandidateDocuments;

  /** Scrutiny officer's observations or rejection reason */
  @Prop({ default: '' })
  scrutinyRemarks: string;

  /** Name/email of the officer who performed verification */
  @Prop({ default: '' })
  verifiedBy: string;

  /** Timestamp of verification decision */
  @Prop({ type: Date, default: null })
  verifiedAt: Date | null;
}

export const CandidateDossierSchema = SchemaFactory.createForClass(CandidateDossier);

// Compound indexes for scrutiny queue queries
CandidateDossierSchema.index({ appliedAdvtId: 1, status: 1 });
CandidateDossierSchema.index({ appliedAdvtId: 1, category: 1 });
CandidateDossierSchema.index({ status: 1, verifiedAt: -1 });
CandidateDossierSchema.index({ fullName: 'text', rollNumber: 'text', registrationId: 'text' });
