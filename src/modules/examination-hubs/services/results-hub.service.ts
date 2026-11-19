import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Job, JobDocument } from '../../jobs/schemas/job.schema';
import { QueryResultsDto } from '../dto/query-results.dto';

@Injectable()
export class ResultsHubService {
  constructor(
    @InjectModel(Job.name)
    private readonly jobModel: Model<JobDocument>,
  ) {}

  async getPublishedResults(query: QueryResultsDto): Promise<Record<string, unknown>> {
    const { agency, search, page = 1, limit = 20 } = query;

    const filter: FilterQuery<JobDocument> = {
      status: 'Result Announced',
    };

    if (agency?.trim()) {
      filter.department = { $regex: agency.trim(), $options: 'i' };
    }

    if (search?.trim()) {
      filter.$or = [
        { postTitle: { $regex: search.trim(), $options: 'i' } },
        { department: { $regex: search.trim(), $options: 'i' } },
        { advtNo: { $regex: search.trim(), $options: 'i' } },
        { gazetteRef: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * safeLimit;

    const [jobs, total] = await Promise.all([
      this.jobModel
        .find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean()
        .exec(),
      this.jobModel.countDocuments(filter).exec(),
    ]);

    const enriched = jobs.map((job) => ({
      id: (job._id as unknown as string).toString(),
      customId: job.customId,
      advtNo: job.advtNo,
      postTitle: job.postTitle,
      slug: job.slug,
      department: job.department,
      vacancies: job.vacancies,
      gazetteRef: job.gazetteRef,
      cutoffMarks: job.cutoffMarks ?? { UR: 0, OBC: 0, SC: 0, ST: 0, EWS: 0 },
      officialWebsiteUrl: job.officialWebsiteUrl,
      officialNoticePdfUrl: job.officialNoticePdfUrl,
      resultAnnouncementDate: (job as unknown as { updatedAt: Date }).updatedAt || (job as unknown as { createdAt: Date }).createdAt,
      meritListPdfUrl: job.officialNoticePdfUrl || `${job.officialWebsiteUrl}/results`,
    }));

    return {
      data: enriched,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }
}
