import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job, JobDocument } from '../../jobs/schemas/job.schema';
import {
  CandidateDossier,
  CandidateDossierDocument,
} from '../../scrutiny/schemas/candidate-dossier.schema';
import { CutoffMarksDto, PublishCutoffsDto } from '../dto/publish-cutoffs.dto';
import { PreviewResultQueryDto } from '../dto/preview-result.dto';
import { MeritEvaluationService } from './merit-evaluation.service';
import { AuditService } from '../../auth/audit/audit.service';

@Injectable()
export class ResultsService {
  constructor(
    @InjectModel(Job.name)
    private readonly jobModel: Model<JobDocument>,

    @InjectModel(CandidateDossier.name)
    private readonly candidateModel: Model<CandidateDossierDocument>,

    private readonly meritEvaluationService: MeritEvaluationService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Preview qualifying candidate count based on cutoffs before final publishing.
   */
  async previewResults(
    notificationId: string,
    queryCutoffs: PreviewResultQueryDto,
  ): Promise<Record<string, unknown>> {
    const job = await this.jobModel.findOne({
      $or: [{ customId: notificationId }, { _id: notificationId.match(/^[0-9a-fA-F]{24}$/) ? notificationId : null }],
    }).lean().exec();

    if (!job) {
      throw new NotFoundException(`Notification not found with ID: ${notificationId}`);
    }

    const effectiveCutoffs: CutoffMarksDto = {
      UR: queryCutoffs.UR ?? job.cutoffMarks?.UR ?? 0,
      OBC: queryCutoffs.OBC ?? job.cutoffMarks?.OBC ?? 0,
      SC: queryCutoffs.SC ?? job.cutoffMarks?.SC ?? 0,
      ST: queryCutoffs.ST ?? job.cutoffMarks?.ST ?? 0,
      EWS: queryCutoffs.EWS ?? job.cutoffMarks?.EWS ?? 0,
    };

    const evaluation = await this.meritEvaluationService.evaluateQualifyingCandidates(
      job.customId,
      effectiveCutoffs,
    );

    return {
      notification: {
        customId: job.customId,
        postTitle: job.postTitle,
        department: job.department,
        vacancies: job.vacancies,
        categoryBreakdown: job.categoryBreakdown,
        currentStatus: job.status,
      },
      effectiveCutoffs,
      evaluation,
    };
  }

  /**
   * Set category cutoffs, mark qualified candidate dossiers, and advance status to 'Result Announced'.
   */
  async publishResults(
    dto: PublishCutoffsDto,
    actorEmail: string,
    actorRole: string,
  ): Promise<Record<string, unknown>> {
    const job = await this.jobModel.findOne({
      $or: [{ customId: dto.notificationId }, { _id: dto.notificationId.match(/^[0-9a-fA-F]{24}$/) ? dto.notificationId : null }],
    });

    if (!job) {
      throw new NotFoundException(`Notification not found with ID: ${dto.notificationId}`);
    }

    if (job.status === 'Rejected / Cancelled') {
      throw new BadRequestException('Cannot publish results for a cancelled notification');
    }

    // Evaluate qualified candidates based on declared cutoffs
    const evaluation = await this.meritEvaluationService.evaluateQualifyingCandidates(
      job.customId,
      dto.cutoffMarks,
    );

    // Update notification status & cutoffs
    job.cutoffMarks = dto.cutoffMarks;
    job.gazetteRef = dto.gazetteRef;
    job.status = 'Result Announced';
    await job.save();

    // Mark qualified candidates with 'Result Announced'
    if (evaluation.qualifiedRollNumbers.length > 0) {
      await this.candidateModel.updateMany(
        {
          appliedAdvtId: job.customId,
          rollNumber: { $in: evaluation.qualifiedRollNumbers },
        },
        {
          $set: { status: 'Result Announced' },
        },
      );
    }

    // Audit logging
    await this.auditService.createAuditLog({
      actor: actorEmail,
      role: actorRole,
      action: 'Cutoff Declared & Gazette Published',
      referenceId: job.customId,
      statusType: 'Result Announced',
      metadata: {
        notificationId: job.customId,
        gazetteRef: dto.gazetteRef,
        cutoffs: dto.cutoffMarks,
        qualifiedCount: evaluation.qualifiedCount,
        categoryBreakdown: evaluation.categoryBreakdown,
      },
    });

    return {
      message: 'Results published successfully and status transitioned to Result Announced',
      job: {
        customId: job.customId,
        postTitle: job.postTitle,
        status: job.status,
        cutoffMarks: job.cutoffMarks,
        gazetteRef: job.gazetteRef,
      },
      evaluationSummary: {
        totalEvaluated: evaluation.totalEvaluated,
        qualifiedCount: evaluation.qualifiedCount,
        disqualifiedCount: evaluation.disqualifiedCount,
        categoryBreakdown: evaluation.categoryBreakdown,
      },
    };
  }
}
