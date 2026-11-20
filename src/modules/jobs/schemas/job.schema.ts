import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// ─── PipelineStatus — matches React admin frontend types exactly ────────────
export type PipelineStatus =
  | 'Application Open / Active'
  | 'Admit Card / Active'
  | 'Answer Key Out'
  | 'Result Announced'
  | 'Pending / Scrutiny'
  | 'Rejected / Cancelled';

export const PIPELINE_STATUS_VALUES: PipelineStatus[] = [
  'Application Open / Active',
  'Admit Card / Active',
  'Answer Key Out',
  'Result Announced',
  'Pending / Scrutiny',
  'Rejected / Cancelled',
];

// ─── CategoryBreakdown — embedded sub-document ──────────────────────────────
@Schema({ _id: false })
export class CategoryBreakdown {
  @Prop({ required: true, default: 0, min: 0 })
  UR: number;

  @Prop({ required: true, default: 0, min: 0 })
  OBC: number;

  @Prop({ required: true, default: 0, min: 0 })
  SC: number;

  @Prop({ required: true, default: 0, min: 0 })
  ST: number;

  @Prop({ required: true, default: 0, min: 0 })
  EWS: number;
}

export const CategoryBreakdownSchema = SchemaFactory.createForClass(CategoryBreakdown);

// ─── ApplicationFees — embedded sub-document ───────────────────────────────
@Schema({ _id: false })
export class ApplicationFees {
  @Prop({ required: true, default: 100, min: 0 })
  general: number;

  @Prop({ required: true, default: 100, min: 0 })
  obc: number;

  @Prop({ required: true, default: 0, min: 0 })
  scSt: number;

  @Prop({ required: true, default: 0, min: 0 })
  female: number;

  @Prop({ default: 'Online via Net Banking, Debit / Credit Card, or UPI', trim: true })
  paymentMode: string;
}

export const ApplicationFeesSchema = SchemaFactory.createForClass(ApplicationFees);

// ─── PostBreakdownItem — embedded sub-document for per-post eligibility ────
@Schema({ _id: false })
export class PostBreakdownItem {
  @Prop({ required: true, trim: true })
  postName: string;

  @Prop({ required: true, default: 0, min: 0 })
  vacancies: number;

  @Prop({ required: true, default: 'Bachelor Degree in Any Stream', trim: true })
  qualification: string;
}

export const PostBreakdownItemSchema = SchemaFactory.createForClass(PostBreakdownItem);

// ─── JobFaqItem — embedded sub-document for Candidate FAQs ─────────────────
@Schema({ _id: false })
export class JobFaqItem {
  @Prop({ required: true, trim: true })
  question: string;

  @Prop({ required: true, trim: true })
  answer: string;
}

export const JobFaqItemSchema = SchemaFactory.createForClass(JobFaqItem);

// ─── Job — main recruitment notification document ───────────────────────────
export type JobDocument = Job & Document;

@Schema({
  timestamps: true,
  collection: 'jobs',
})
export class Job {
  /** Unique notification identifier — e.g. "UPSC-CSE-2026-01" */
  @Prop({ required: true, unique: true, index: true, trim: true })
  customId: string;

  /** Official advertisement number — e.g. "Advt. No. 05/2026-CSP" */
  @Prop({ default: '', trim: true })
  advtNo: string;

  /** Full post title — e.g. "Civil Services (Preliminary) Examination 2026" */
  @Prop({ default: '', trim: true })
  postTitle: string;

  /** URL-safe slug — auto-generated or supplied */
  @Prop({ required: true, unique: true, lowercase: true, index: true })
  slug: string;

  /** Recruiting body — e.g. "Union Public Service Commission (UPSC)" */
  @Prop({ default: '', index: true, trim: true })
  department: string;

  /** Ministry / cadre code — e.g. "DoPT · All India Services" */
  @Prop({ default: '', trim: true })
  ministryCode: string;

  /** Pay matrix reference — e.g. "Level-10 (₹56,100 – ₹1,77,500)" */
  @Prop({ default: '', trim: true })
  payLevel: string;

  /** Total advertised vacancies */
  @Prop({ default: 0, min: 0 })
  vacancies: number;

  /** Auto-calculated statutory category breakdown */
  @Prop({ type: CategoryBreakdownSchema, required: true })
  categoryBreakdown: CategoryBreakdown;

  /** Number of applications received */
  @Prop({ default: 0, min: 0 })
  applicationsReceived: number;

  /** Applications pending scrutiny */
  @Prop({ default: 0, min: 0 })
  scrutinyPending: number;

  /** Application start / opening date — "YYYY-MM-DD" */
  @Prop({ default: null })
  startDate: string;

  /** Application deadline date — "YYYY-MM-DD" */
  @Prop({ default: '', trim: true })
  deadlineDate: string;

  /** Exam date — "YYYY-MM-DD" (optional until scheduled) */
  @Prop({ default: null })
  examDate: string;

  /** Pipeline status matching the React admin frontend PipelineStatus union */
  @Prop({
    required: true,
    enum: PIPELINE_STATUS_VALUES,
    default: 'Pending / Scrutiny',
    index: true,
  })
  status: PipelineStatus;

  /** Category-wise cutoff marks (set after result evaluation) */
  @Prop({
    type: CategoryBreakdownSchema,
    default: () => ({ UR: 0, OBC: 0, SC: 0, ST: 0, EWS: 0 }),
  })
  cutoffMarks: CategoryBreakdown;

  /** Gazette notification reference — e.g. "GSR-412(E)/2026" */
  @Prop({ required: true, trim: true })
  gazetteRef: string;

  /** Count of admit cards released */
  @Prop({ default: 0, min: 0 })
  admitCardsReleased: number;

  /** Official recruiting body website */
  @Prop({ default: 'https://upsc.gov.in', trim: true })
  officialWebsiteUrl: string;

  /** Direct official apply online portal URL */
  @Prop({ default: 'https://upsc.gov.in', trim: true })
  applyOnlineUrl: string;

  /** URL to official notice PDF */
  @Prop({ default: null, trim: true })
  officialNoticePdfUrl: string;

  /** Direct link to download Admit Card / Hall Ticket */
  @Prop({ default: null, trim: true })
  admitCardUrl?: string;

  /** Direct link to view/download Answer Key & Objection Tracker */
  @Prop({ default: null, trim: true })
  answerKeyUrl?: string;

  /** Direct link to download official Syllabus PDF */
  @Prop({ default: null, trim: true })
  syllabusUrl?: string;

  /** Multi-stage selection process and examination scheme */
  @Prop({
    type: [String],
    default: [
      'Stage 1: Preliminary Computer Based Exam / Screening Test',
      'Stage 2: Main Written Examination / Technical Evaluation',
      'Stage 3: Document Verification & Final Cadre Allocation',
    ],
  })
  selectionStages: string[];

  /** State applicability — "ALL" or state code like "UP", "BR" */
  @Prop({ default: 'ALL', index: true, uppercase: true })
  stateCode: string;

  /** Minimum education tier required */
  @Prop({ default: 'Graduate', index: true })
  educationTier: string;

  /** Trending flag — shown in BharatRojgar homepage highlights */
  @Prop({ default: false, index: true })
  isTrending: boolean;

  /** Official application fee structure */
  @Prop({
    type: ApplicationFeesSchema,
    default: () => ({ general: 100, obc: 100, scSt: 0, female: 0, paymentMode: 'Online via Net Banking, Debit / Credit Card, or UPI' }),
  })
  applicationFees: ApplicationFees;

  /** Minimum education & qualification summary */
  @Prop({ default: 'Bachelor Degree in required discipline from recognized University / Board', trim: true })
  qualificationSummary: string;

  /** Age limit summary including cut-off dates and relaxations */
  @Prop({ default: '18 to 32 Years as on official notification cut-off date', trim: true })
  ageLimitSummary: string;

  /** Specific post-wise vacancies and qualifications */
  @Prop({ type: [PostBreakdownItemSchema], default: [] })
  postBreakdown: PostBreakdownItem[];

  /** Detailed official recruitment overview & job description */
  @Prop({
    default: '',
    trim: true,
  })
  description: string;

  /** Frequently asked questions (FAQs) for candidates */
  @Prop({ type: [JobFaqItemSchema], default: [] })
  faqs: JobFaqItem[];
}

export const JobSchema = SchemaFactory.createForClass(Job);

// Compound indexes for common query patterns
JobSchema.index({ status: 1, deadlineDate: -1 });
JobSchema.index({ department: 1, status: 1 });
JobSchema.index({ stateCode: 1, status: 1 });
JobSchema.index({ isTrending: 1, status: 1 });
JobSchema.index({ postTitle: 'text', department: 'text' }); // Full-text search
