import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CandidateDossier,
  CandidateDossierDocument,
  ReservationCategory,
} from '../../scrutiny/schemas/candidate-dossier.schema';
import { CutoffMarksDto } from '../dto/publish-cutoffs.dto';

export interface MeritEvaluationResult {
  totalEvaluated: number;
  qualifiedCount: number;
  disqualifiedCount: number;
  categoryBreakdown: Record<ReservationCategory, number>;
  qualifiedRollNumbers: string[];
}

@Injectable()
export class MeritEvaluationService {
  constructor(
    @InjectModel(CandidateDossier.name)
    private readonly candidateModel: Model<CandidateDossierDocument>,
  ) {}

  /**
   * Evaluate candidate dossiers against category cutoff marks.
   */
  async evaluateQualifyingCandidates(
    notificationId: string,
    cutoffs: CutoffMarksDto,
  ): Promise<MeritEvaluationResult> {
    const candidates = await this.candidateModel.find({
      appliedAdvtId: notificationId,
      status: { $ne: 'Rejected / Cancelled' },
      writtenScore: { $ne: null },
    }).lean().exec();

    const breakdown: Record<ReservationCategory, number> = {
      UR: 0,
      OBC: 0,
      SC: 0,
      ST: 0,
      EWS: 0,
    };

    const qualifiedRollNumbers: string[] = [];

    for (const candidate of candidates) {
      if (candidate.writtenScore === null || candidate.writtenScore === undefined) {
        continue;
      }

      const threshold = cutoffs[candidate.category] ?? 0;
      if (candidate.writtenScore >= threshold) {
        qualifiedRollNumbers.push(candidate.rollNumber);
        if (breakdown[candidate.category] !== undefined) {
          breakdown[candidate.category]++;
        }
      }
    }

    const qualifiedCount = qualifiedRollNumbers.length;
    const totalEvaluated = candidates.length;
    const disqualifiedCount = totalEvaluated - qualifiedCount;

    return {
      totalEvaluated,
      qualifiedCount,
      disqualifiedCount,
      categoryBreakdown: breakdown,
      qualifiedRollNumbers,
    };
  }
}
