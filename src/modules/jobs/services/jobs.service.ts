import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { FilterQuery, Model } from 'mongoose';
import { Job, JobDocument } from '../schemas/job.schema';
import { CreateJobDto } from '../dto/create-job.dto';
import { UpdateJobDto } from '../dto/update-job.dto';
import { QueryJobDto } from '../dto/query-job.dto';
import { QuotaCalculationService } from './quota-calculation.service';
import { AuditService } from '../../auth/audit/audit.service';

@Injectable()
export class JobsService {
  constructor(
    @InjectModel(Job.name)
    private readonly jobModel: Model<JobDocument>,
    private readonly quotaService: QuotaCalculationService,
    private readonly auditService: AuditService,
  ) {}

  // ─── CREATE ───────────────────────────────────────────────────────────────

  async create(dto: CreateJobDto, actorEmail: string, actorRole: string) {
    // Check uniqueness of customId
    const existingById = await this.jobModel.findOne({ customId: dto.customId });
    if (existingById) {
      throw new ConflictException(`Job with customId "${dto.customId}" already exists`);
    }

    // Auto-generate slug if not provided
    const slug = dto.slug ?? this.quotaService.generateSlug(dto.postTitle);

    const existingBySlug = await this.jobModel.findOne({ slug });
    if (existingBySlug) {
      throw new ConflictException(`Job with slug "${slug}" already exists`);
    }

    // Auto-calculate statutory quota breakdown
    const categoryBreakdown = this.quotaService.computeQuotas(dto.vacancies);

    const job = await this.jobModel.create({
      ...dto,
      slug,
      categoryBreakdown,
      status: dto.status ?? 'Pending / Scrutiny',
    });

    await this.auditService.createAuditLog({
      actor: actorEmail,
      role: actorRole,
      action: 'CREATE_JOB',
      referenceId: (job._id as unknown as string).toString(),
      statusType: job.status,
      metadata: {
        customId: job.customId,
        vacancies: job.vacancies,
        categoryBreakdown,
      },
    });

    return job.toObject();
  }

  // ─── FIND ALL (with filters & pagination) ────────────────────────────────

  async findAll(query: QueryJobDto) {
    const {
      status,
      department,
      keyword,
      stateCode,
      educationTier,
      isTrending,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: FilterQuery<JobDocument> = {};

    if (status) filter.status = status;
    if (stateCode && stateCode !== 'ALL') filter.stateCode = { $in: [stateCode, 'ALL'] };
    if (educationTier) filter.educationTier = educationTier;
    if (isTrending !== undefined) filter.isTrending = isTrending;
    if (department) filter.department = { $regex: department, $options: 'i' };

    if (keyword) {
      filter.$or = [
        { postTitle: { $regex: keyword, $options: 'i' } },
        { department: { $regex: keyword, $options: 'i' } },
        { customId: { $regex: keyword, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * Math.min(limit, 100);
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      this.jobModel
        .find(filter)
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(Math.min(limit, 100))
        .lean()
        .exec(),
      this.jobModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit: Math.min(limit, 100),
        totalPages: Math.ceil(total / Math.min(limit, 100)),
      },
    };
  }

  // ─── FIND ONE BY ID OR SLUG ───────────────────────────────────────────────

  private getLookupFilter(idOrCustomId: string): FilterQuery<JobDocument> {
    if (mongoose.isValidObjectId(idOrCustomId)) {
      return { $or: [{ _id: idOrCustomId }, { customId: idOrCustomId }] };
    }
    return { customId: idOrCustomId };
  }

  async findById(id: string) {
    const filter = this.getLookupFilter(id);
    const job = await this.jobModel.findOne(filter).lean().exec();
    if (!job) throw new NotFoundException(`Job not found with id or customId: ${id}`);
    return job;
  }

  async findBySlug(slug: string) {
    const job = await this.jobModel.findOne({ slug }).lean().exec();
    if (!job) throw new NotFoundException(`Job not found with slug: ${slug}`);
    return job;
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateJobDto, actorEmail: string, actorRole: string) {
    const filter = this.getLookupFilter(id);
    const existing = await this.jobModel.findOne(filter);
    if (!existing) throw new NotFoundException(`Job not found with id or customId: ${id}`);

    const updatePayload: Partial<Job> = { ...dto } as Partial<Job>;

    // If vacancies changed → recalculate category breakdown automatically
    if (dto.vacancies !== undefined && dto.vacancies !== existing.vacancies) {
      updatePayload.categoryBreakdown = this.quotaService.computeQuotas(dto.vacancies);
    }

    // If advancing to 'Admit Card / Active', auto-populate admitCardsReleased if not explicitly set
    if (
      dto.status === 'Admit Card / Active' &&
      (dto as any).admitCardsReleased === undefined &&
      !existing.admitCardsReleased
    ) {
      updatePayload.admitCardsReleased = existing.applicationsReceived || existing.vacancies || 500;
    }

    const updated = await this.jobModel
      .findOneAndUpdate(filter, { $set: updatePayload }, { new: true, runValidators: true })
      .lean()
      .exec();

    await this.auditService.createAuditLog({
      actor: actorEmail,
      role: actorRole,
      action: 'UPDATE_JOB',
      referenceId: (existing._id as unknown as string).toString(),
      statusType: updated?.status,
      metadata: { changes: Object.keys(dto) },
    });

    return updated;
  }
}
