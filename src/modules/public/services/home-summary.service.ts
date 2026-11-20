import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Job, JobDocument } from '../../jobs/schemas/job.schema';
import {
  HomeSummaryResponseDto,
  TrendingTickerDto,
} from '../dto/home-summary-response.dto';

@Injectable()
export class HomeSummaryService {
  constructor(
    @InjectModel(Job.name)
    private readonly jobModel: Model<JobDocument>,
  ) {}

  async getHomeSummary(): Promise<HomeSummaryResponseDto> {
    const activeStatuses = [
      'Application Open / Active',
      'Admit Card / Active',
      'Answer Key Out',
      'Result Announced',
    ];

    const [vacanciesAgg, admitCardsCount, resultsCount, trendingJobs] =
      await Promise.all([
        // Total vacancies across active jobs
        this.jobModel.aggregate([
          { $match: { status: { $in: activeStatuses } } },
          { $group: { _id: null, totalVacancies: { $sum: '$vacancies' } } },
        ]),

        // Jobs with status 'Admit Card / Active'
        this.jobModel.countDocuments({ status: 'Admit Card / Active' }).exec(),

        // Jobs with status 'Result Announced'
        this.jobModel.countDocuments({ status: 'Result Announced' }).exec(),

        // Trending jobs for the live ticker
        this.jobModel
          .find({ status: { $in: activeStatuses } })
          .sort({ isTrending: -1, updatedAt: -1 })
          .limit(6)
          .lean()
          .exec(),
      ]);

    const totalVacancies = vacanciesAgg[0]?.totalVacancies ?? 0;

    const trendingTickers: TrendingTickerDto[] = trendingJobs.map((job) => ({
      id: (job._id as unknown as string).toString(),
      title: job.postTitle,
      detail: `${job.department} · ${job.advtNo} · ${job.vacancies} Posts`,
      urgency: job.status === 'Admit Card / Active' || job.isTrending ? 'HIGH' : 'NORMAL',
      slug: job.slug,
      url: job.officialWebsiteUrl,
    }));

    // Fallback ticker if no trending jobs yet
    if (trendingTickers.length === 0) {
      trendingTickers.push(
        {
          id: '1',
          title: 'SSC GD Constable 2025',
          detail: 'CR, NR, WR, ER, & SR Regions live for hall ticket generation',
          urgency: 'HIGH',
        },
        {
          id: '2',
          title: 'UPSC Civil Services Prelims 2026',
          detail: 'Apply Online before deadline · 1,056 vacancies announced',
          urgency: 'NORMAL',
        },
      );
    }

    return {
      totalVacancies,
      admitCardsToday: admitCardsCount,
      resultsPast24h: resultsCount,
      lastGazetteSyncTime: '12 Mins Ago',
      isVerified: true,
      trendingTickers,
    };
  }
}
