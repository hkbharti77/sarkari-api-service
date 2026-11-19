import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import {
  CandidateDossier,
  CandidateDossierDocument,
  ReservationCategory,
} from './schemas/candidate-dossier.schema';
import { CandidateDocuments } from './schemas/candidate-documents.schema';
import { Job, JobDocument } from '../jobs/schemas/job.schema';
import { UpdateScrutinyDto } from './dto/update-scrutiny.dto';
import { QueryScrutinyQueueDto } from './dto/query-scrutiny-queue.dto';
import { BulkVerifyDto } from './dto/bulk-verify.dto';
import { AuditService } from '../auth/audit/audit.service';

// ─── 5-Point Mandatory Document Checklist Rule ──────────────────────────────
/**
 * Core documents: photoSignature, nationalId, degreeCertificate, feeReceipt
 *   → mandatory for ALL categories.
 * categoryCertificate
 *   → mandatory only for reserved categories (OBC / SC / ST / EWS).
 */
function isDossierCompliant(
  docs: CandidateDocuments,
  category: ReservationCategory,
): boolean {
  const coreValid =
    docs.photoSignature &&
    docs.nationalId &&
    docs.degreeCertificate &&
    docs.feeReceipt;

  const categoryValid = category === 'UR' || docs.categoryCertificate;

  return coreValid && categoryValid;
}

@Injectable()
export class ScrutinyService {
  constructor(
    @InjectModel(CandidateDossier.name)
    private readonly dossierModel: Model<CandidateDossierDocument>,

    @InjectModel(Job.name)
    private readonly jobModel: Model<JobDocument>,

    private readonly auditService: AuditService,
  ) {}

  // ─── QUERY SCRUTINY QUEUE ─────────────────────────────────────────────────

  async findQueue(query: QueryScrutinyQueueDto): Promise<Record<string, unknown>> {
    const { advtId, status, category, search, page = 1, limit = 25 } = query;

    const filter: FilterQuery<CandidateDossierDocument> = {};

    if (advtId) filter.appliedAdvtId = advtId;
    if (status) filter.status = status;
    if (category) filter.category = category;

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
        { registrationId: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * Math.min(limit, 100);

    const [data, total] = await Promise.all([
      this.dossierModel
        .find(filter)
        .sort({ submittedAt: 1 })   // FIFO — oldest first
        .skip(skip)
        .limit(Math.min(limit, 100))
        .lean()
        .exec(),
      this.dossierModel.countDocuments(filter).exec(),
    ]);

    // Annotate each dossier with compliance flag
    const annotated = data.map((d) => ({
      ...d,
      isCompliant: isDossierCompliant(d.documents, d.category),
    }));

    return {
      data: annotated,
      meta: {
        total,
        page,
        limit: Math.min(limit, 100),
        totalPages: Math.ceil(total / Math.min(limit, 100)),
      },
    };
  }

  // ─── UPDATE SINGLE DOSSIER SCRUTINY ──────────────────────────────────────

  async updateScrutiny(
    rollNumber: string,
    dto: UpdateScrutinyDto,
    actorEmail: string,
    actorRole: string,
  ) {
    const dossier = await this.dossierModel.findOne({ rollNumber });
    if (!dossier) {
      throw new NotFoundException(`Candidate not found with roll number: ${rollNumber}`);
    }

    // ─ Validate: rejection requires remarks ────────────────────────────────
    if (dto.status === 'Rejected / Cancelled' && !dto.scrutinyRemarks?.trim()) {
      throw new BadRequestException(
        'scrutinyRemarks are mandatory when rejecting a candidate',
      );
    }

    const previousStatus = dossier.status;

    // ─ Merge document flags ─────────────────────────────────────────────────
    if (dto.documents) {
      Object.assign(dossier.documents, dto.documents);
      dossier.markModified('documents');
    }

    // ─ Update scalar fields ──────────────────────────────────────────────────
    if (dto.scrutinyRemarks !== undefined) dossier.scrutinyRemarks = dto.scrutinyRemarks;
    if (dto.writtenScore !== undefined) dossier.writtenScore = dto.writtenScore;

    // ─ Check compliance before allowing approval ─────────────────────────────
    if (dto.status === 'Admit Card / Active') {
      const compliant = isDossierCompliant(dossier.documents, dossier.category);
      if (!compliant) {
        throw new BadRequestException(
          'Cannot approve dossier: 5-point document checklist is not fully satisfied. ' +
          'Ensure all mandatory documents are verified (photoSignature, nationalId, ' +
          'degreeCertificate, feeReceipt, and categoryCertificate for reserved categories).',
        );
      }
      dossier.verifiedBy = actorEmail;
      dossier.verifiedAt = new Date();
    }

    if (dto.status) dossier.status = dto.status;
    await dossier.save();

    // ─ Update parent job counters when status transitions ───────────────────
    if (previousStatus !== dto.status) {
      const jobUpdate: Record<string, Record<string, number>> = {};

      if (dto.status === 'Admit Card / Active') {
        // Approved: decrement scrutiny queue, increment admit cards
        jobUpdate['$inc'] = { scrutinyPending: -1, admitCardsReleased: 1 };
      } else if (dto.status === 'Rejected / Cancelled') {
        // Rejected: decrement scrutiny queue only
        jobUpdate['$inc'] = { scrutinyPending: -1 };
      }

      if (Object.keys(jobUpdate).length > 0) {
        await this.jobModel.findOneAndUpdate(
          { customId: dossier.appliedAdvtId },
          jobUpdate,
        );
      }
    }

    // ─ Audit log ─────────────────────────────────────────────────────────────
    await this.auditService.createAuditLog({
      actor: actorEmail,
      role: actorRole,
      action: 'SCRUTINY_UPDATE',
      referenceId: rollNumber,
      statusType: dto.status ?? dossier.status,
      metadata: {
        rollNumber,
        previousStatus,
        newStatus: dto.status,
        isCompliant: isDossierCompliant(dossier.documents, dossier.category),
      },
    });

    return dossier.toObject();
  }

  // ─── BULK VERIFY ──────────────────────────────────────────────────────────

  async bulkVerify(dto: BulkVerifyDto, actorEmail: string, actorRole: string) {
    const results: {
      rollNumber: string;
      status: 'approved' | 'skipped';
      reason?: string;
    }[] = [];

    for (const rollNumber of dto.rollNumbers) {
      const dossier = await this.dossierModel.findOne({ rollNumber });

      if (!dossier) {
        results.push({ rollNumber, status: 'skipped', reason: 'Not found' });
        continue;
      }

      if (dossier.status !== 'Pending / Scrutiny') {
        results.push({
          rollNumber,
          status: 'skipped',
          reason: `Already in status: ${dossier.status}`,
        });
        continue;
      }

      const compliant = isDossierCompliant(dossier.documents, dossier.category);
      if (!compliant) {
        results.push({
          rollNumber,
          status: 'skipped',
          reason: 'Document checklist not satisfied',
        });
        continue;
      }

      // All checks passed — approve
      dossier.status = 'Admit Card / Active';
      dossier.verifiedBy = actorEmail;
      dossier.verifiedAt = new Date();
      dossier.scrutinyRemarks = dossier.scrutinyRemarks || 'Bulk verified — all documents compliant';
      await dossier.save();

      // Update parent job counters
      await this.jobModel.findOneAndUpdate(
        { customId: dossier.appliedAdvtId },
        { $inc: { scrutinyPending: -1, admitCardsReleased: 1 } },
      );

      await this.auditService.createAuditLog({
        actor: actorEmail,
        role: actorRole,
        action: 'BULK_SCRUTINY_APPROVE',
        referenceId: rollNumber,
        statusType: 'Admit Card / Active',
        metadata: { rollNumber, via: 'bulk-verify' },
      });

      results.push({ rollNumber, status: 'approved' });
    }

    const approved = results.filter((r) => r.status === 'approved').length;
    const skipped  = results.filter((r) => r.status === 'skipped').length;

    return {
      summary: { total: dto.rollNumbers.length, approved, skipped },
      results,
    };
  }
}
