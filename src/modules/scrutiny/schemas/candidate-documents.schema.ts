import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * 5-Point mandatory document checklist embedded sub-document.
 * Photo + National ID + Degree + Fee Receipt → mandatory for ALL categories.
 * Category Certificate → mandatory only for reserved categories (OBC/SC/ST/EWS).
 */
@Schema({ _id: false })
export class CandidateDocuments {
  @Prop({ required: true, default: false })
  photoSignature: boolean;

  @Prop({ required: true, default: false })
  nationalId: boolean;

  @Prop({ required: true, default: false })
  degreeCertificate: boolean;

  @Prop({ required: true, default: false })
  categoryCertificate: boolean;

  @Prop({ required: true, default: false })
  feeReceipt: boolean;
}

export const CandidateDocumentsSchema = SchemaFactory.createForClass(CandidateDocuments);
