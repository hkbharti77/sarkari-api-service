import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Job, JobDocument } from '../../jobs/schemas/job.schema';
import {
  PublicJobSortOption,
  PublicSearchQueryDto,
} from '../dto/public-search-query.dto';

@Injectable()
export class PublicJobsService {
  constructor(
    @InjectModel(Job.name)
    private readonly jobModel: Model<JobDocument>,
  ) {}

  /**
   * Search public jobs with faceted filtering and pagination.
   */
  async searchJobs(query: PublicSearchQueryDto): Promise<Record<string, unknown>> {
    const {
      search,
      qualification,
      state,
      category,
      status,
      sort = PublicJobSortOption.DEADLINE_ASC,
      page = 1,
      limit = 20,
    } = query;

    const filter: FilterQuery<JobDocument> = {
      status: {
        $in: [
          'Application Open / Active',
          'Admit Card / Active',
          'Answer Key Out',
          'Result Announced',
        ],
      },
    };

    if (search?.trim()) {
      filter.$or = [
        { postTitle: { $regex: search.trim(), $options: 'i' } },
        { department: { $regex: search.trim(), $options: 'i' } },
        { advtNo: { $regex: search.trim(), $options: 'i' } },
        { customId: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    if (qualification) {
      filter.educationTier = qualification;
    }

    if (state && state.toUpperCase() !== 'ALL') {
      filter.stateCode = { $in: [state.toUpperCase(), 'ALL'] };
    }

    if (category?.trim()) {
      filter.department = { $regex: category.trim(), $options: 'i' };
    }

    const todayStr = new Date().toISOString().split('T')[0];

    if (status) {
      const upperStatus = status.toUpperCase();
      if (upperStatus === 'OPEN') {
        filter.deadlineDate = { $gte: todayStr };
      } else if (upperStatus === 'CLOSING_SOON') {
        const in5Days = new Date();
        in5Days.setDate(in5Days.getDate() + 5);
        const in5DaysStr = in5Days.toISOString().split('T')[0];
        filter.deadlineDate = { $gte: todayStr, $lte: in5DaysStr };
      } else if (upperStatus === 'CLOSED') {
        filter.deadlineDate = { $lt: todayStr };
      }
    }

    // Determine sort
    let sortObj: Record<string, 1 | -1> = { deadlineDate: 1 };
    switch (sort) {
      case PublicJobSortOption.NEWEST:
        sortObj = { createdAt: -1 };
        break;
      case PublicJobSortOption.VACANCIES_DESC:
        sortObj = { vacancies: -1 };
        break;
      case PublicJobSortOption.PAY_DESC:
        sortObj = { payLevel: -1 };
        break;
      case PublicJobSortOption.DEADLINE_ASC:
      default:
        sortObj = { deadlineDate: 1 };
        break;
    }

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * safeLimit;

    const [data, total] = await Promise.all([
      this.jobModel
        .find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(safeLimit)
        .lean()
        .exec(),
      this.jobModel.countDocuments(filter).exec(),
    ]);

    // Sanitize any residual DRAFT- prefixes so public visitors always see clean official identifiers
    const sanitizedData = data.map((job) => {
      const cleanCustomId = (job.customId || '').replace(/^DRAFT-/i, '');
      const cleanSlug = (job.slug || cleanCustomId.toLowerCase()).replace(/-draft-[0-9]+/gi, '');
      return {
        ...job,
        customId: cleanCustomId,
        slug: cleanSlug,
      };
    });

    return {
      data: sanitizedData,
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  /**
   * Get single job by public URL slug, custom ID, or advertisement number.
   */
  async findBySlug(slug: string): Promise<Record<string, unknown>> {
    const clean = slug.trim();
    const withoutDraft = clean.replace(/^DRAFT-/i, '');
    const withDraft = `DRAFT-${withoutDraft}`;
    const cleanSlug = clean.toLowerCase().replace(/-draft-[0-9]+/gi, '');

    const job = await this.jobModel
      .findOne({
        $or: [
          { slug: clean.toLowerCase() },
          { slug: cleanSlug },
          { customId: { $regex: new RegExp(`^(${clean}|${withoutDraft}|${withDraft})$`, 'i') } },
          { advtNo: { $regex: new RegExp(`^${clean}$`, 'i') } },
        ],
      })
      .lean()
      .exec();

    if (!job) {
      throw new NotFoundException(
        `Recruitment notification not found for identifier: ${slug}`,
      );
    }

    const cleanCustomId = (job.customId || '').replace(/^DRAFT-/i, '');
    const finalCleanSlug = (job.slug || cleanCustomId.toLowerCase()).replace(/-draft-[0-9]+/gi, '');

    return {
      ...job,
      customId: cleanCustomId,
      slug: finalCleanSlug,
    };
  }
}
