import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Job, JobDocument } from '../../jobs/schemas/job.schema';
import { QueryAdmitCardsDto } from '../dto/query-admit-cards.dto';

@Injectable()
export class AdmitCardsService {
  constructor(
    @InjectModel(Job.name)
    private readonly jobModel: Model<JobDocument>,
  ) {}

  async getAdmitCards(query: QueryAdmitCardsDto): Promise<Record<string, unknown>> {
    const { agency, search, page = 1, limit = 20 } = query;

    const filter: FilterQuery<JobDocument> = {
      $or: [
        { status: 'Admit Card / Active' },
        { status: { $regex: /admit card/i } },
        { admitCardsReleased: { $gt: 0 } },
      ],
    };

    if (agency?.trim()) {
      filter.department = { $regex: agency.trim(), $options: 'i' };
    }

    if (search?.trim()) {
      const searchRegex = { $regex: search.trim(), $options: 'i' };
      filter.$and = [
        {
          $or: [
            { postTitle: searchRegex },
            { department: searchRegex },
            { advtNo: searchRegex },
          ],
        },
      ];
    }

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * safeLimit;

    const [jobs, total] = await Promise.all([
      this.jobModel
        .find(filter)
        .sort({ examDate: 1, updatedAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean()
        .exec(),
      this.jobModel.countDocuments(filter).exec(),
    ]);

    const enriched = jobs.map((job) => {
      // Determine regional portals if applicable
      const isSsc = /ssc/i.test(job.department);
      const isRrb = /rrb|railway/i.test(job.department);

      const regionalPortals = isSsc
        ? [
            { region: 'Northern Region (NR)', url: 'https://sscnr.nic.in' },
            { region: 'Central Region (CR)', url: 'https://ssc-cr.org' },
            { region: 'Western Region (WR)', url: 'https://sscwr.net' },
            { region: 'Eastern Region (ER)', url: 'https://sscer.org' },
            { region: 'Southern Region (SR)', url: 'https://sscsr.gov.in' },
          ]
        : isRrb
        ? [
            { region: 'RRB Chandigarh', url: 'https://rrbcdg.gov.in' },
            { region: 'RRB Allahabad', url: 'https://rrbald.gov.in' },
            { region: 'RRB Mumbai', url: 'https://rrbmumbai.gov.in' },
            { region: 'RRB Kolkata', url: 'https://rrbkolkata.gov.in' },
          ]
        : [{ region: 'Official Portal', url: job.officialWebsiteUrl }];

      return {
        id: (job._id as unknown as string).toString(),
        customId: job.customId,
        advtNo: job.advtNo,
        postTitle: job.postTitle,
        slug: job.slug,
        department: job.department,
        vacancies: job.vacancies,
        examDate: job.examDate ?? 'To be notified',
        admitCardsReleased: job.admitCardsReleased,
        officialWebsiteUrl: job.officialWebsiteUrl,
        officialNoticePdfUrl: job.officialNoticePdfUrl,
        regionalPortals,
        cityIntimationSlipStatus: job.examDate ? 'Released' : 'Pending Announcement',
        reportingWindow: 'Entry closes 30 minutes before exam shift timing',
      };
    });

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
