import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job, JobDocument, PipelineStatus } from '../schemas/job.schema';

export interface KpiSummary {
  totalRequisitions: number;
  activeRequisitions: number;        // 'Admit Card / Active'
  pendingScrutiny: number;           // 'Pending / Scrutiny'
  resultAnnounced: number;           // 'Result Announced'
  rejectedCancelled: number;         // 'Rejected / Cancelled'
  totalVacancies: number;            // sum of all job.vacancies
  totalApplications: number;         // sum of all job.applicationsReceived
  totalAdmitCardsReleased: number;   // sum of all job.admitCardsReleased
  scrutinyQueueDepth: number;        // sum of all job.scrutinyPending
  computedAt: string;                // ISO timestamp
}

@Injectable()
export class KpiService {
  constructor(
    @InjectModel(Job.name)
    private readonly jobModel: Model<JobDocument>,
  ) {}

  async computeKpis(): Promise<KpiSummary> {
    const [statusCounts, aggregateTotals] = await Promise.all([
      // Status-wise count
      this.jobModel.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),

      // Numeric aggregates across all jobs
      this.jobModel.aggregate([
        {
          $group: {
            _id: null,
            totalRequisitions:       { $sum: 1 },
            totalVacancies:          { $sum: '$vacancies' },
            totalApplications:       { $sum: '$applicationsReceived' },
            totalAdmitCardsReleased: { $sum: '$admitCardsReleased' },
            scrutinyQueueDepth:      { $sum: '$scrutinyPending' },
          },
        },
      ]),
    ]);

    // Map status counts
    const statusMap: Partial<Record<PipelineStatus, number>> = {};
    for (const row of statusCounts) {
      statusMap[row._id as PipelineStatus] = row.count;
    }

    const agg = aggregateTotals[0] ?? {
      totalRequisitions: 0,
      totalVacancies: 0,
      totalApplications: 0,
      totalAdmitCardsReleased: 0,
      scrutinyQueueDepth: 0,
    };

    return {
      totalRequisitions:       agg.totalRequisitions,
      activeRequisitions:      statusMap['Admit Card / Active'] ?? 0,
      pendingScrutiny:         statusMap['Pending / Scrutiny'] ?? 0,
      resultAnnounced:         statusMap['Result Announced'] ?? 0,
      rejectedCancelled:       statusMap['Rejected / Cancelled'] ?? 0,
      totalVacancies:          agg.totalVacancies,
      totalApplications:       agg.totalApplications,
      totalAdmitCardsReleased: agg.totalAdmitCardsReleased,
      scrutinyQueueDepth:      agg.scrutinyQueueDepth,
      computedAt:              new Date().toISOString(),
    };
  }
}
