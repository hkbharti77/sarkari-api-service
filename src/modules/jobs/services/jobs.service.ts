import {
  Injectable,
  NotFoundException,
  ConflictException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { FilterQuery, Model } from 'mongoose';
import { Job, JobDocument } from '../schemas/job.schema';
import { CreateJobDto } from '../dto/create-job.dto';
import { UpdateJobDto } from '../dto/update-job.dto';
import { QueryJobDto } from '../dto/query-job.dto';
import { QuotaCalculationService } from './quota-calculation.service';
import { AuditService } from '../../auth/audit/audit.service';
import { CacheService } from '../../../cache/cache-invalidation.interceptor';

@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectModel(Job.name)
    private readonly jobModel: Model<JobDocument>,
    private readonly quotaService: QuotaCalculationService,
    private readonly auditService: AuditService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Clears public endpoint cache keys whenever jobs are created, updated, or removed
   */
  private invalidatePublicCache() {
    try {
      this.cacheService.deletePattern(/^cache:/);
    } catch (err) {
      this.logger.warn('[JobsService] Cache invalidation notice:', err);
    }
  }

  async onModuleInit() {
    try {
      // Find all jobs that are live or published and sanitize any residual DRAFT- prefixes
      const liveJobsWithDraftId = await this.jobModel
        .find({
          status: { $ne: 'Pending / Scrutiny' },
          customId: { $regex: /^DRAFT-/i },
        })
        .exec();

      for (const job of liveJobsWithDraftId) {
        const cleanCustomId = job.customId.replace(/^DRAFT-/i, '');
        const cleanSlug = job.slug
          ? job.slug.replace(/-draft-[0-9]+/gi, '')
          : cleanCustomId.toLowerCase();
        await this.jobModel.updateOne(
          { _id: job._id },
          {
            $set: {
              customId: cleanCustomId,
              slug: cleanSlug,
            },
          },
        );
        this.logger.log(`[JobsService] Auto-promoted live job ${job._id}: ${job.customId} -> ${cleanCustomId}`);
      }
      this.invalidatePublicCache();
    } catch (err) {
      this.logger.warn('[JobsService] Initialization auto-promotion warning:', err);
    }
  }

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

    // Category breakdown: Use submitted breakdown if provided; otherwise default to 0s
    // Never mathematically fabricate quota percentages
    const categoryBreakdown = dto.categoryBreakdown
      ? {
          UR: Number(dto.categoryBreakdown.UR) || 0,
          OBC: Number(dto.categoryBreakdown.OBC) || 0,
          SC: Number(dto.categoryBreakdown.SC) || 0,
          ST: Number(dto.categoryBreakdown.ST) || 0,
          EWS: Number(dto.categoryBreakdown.EWS) || 0,
        }
      : { UR: 0, OBC: 0, SC: 0, ST: 0, EWS: 0 };

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

    this.invalidatePublicCache();
    return job.toObject();
  }

  // ─── CREATE DRAFT FROM AI EXTRACTION (Option B: Direct DB Auto-Save) ──────

  async createDraftFromExtraction(
    extracted: any,
    actorEmail: string,
    actorRole: string,
  ) {
    const postTitle = extracted.postTitle || 'Recruitment Requisition (AI Draft)';
    const dept =
      extracted.department && extracted.department.trim().length > 0
        ? extracted.department.trim()
        : 'N/A';
    const deptMatch = dept.match(/\(([A-Z]+)\)/);
    const deptAcronym = deptMatch
      ? deptMatch[1]
      : dept === 'N/A'
      ? 'NA'
      : dept.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'REQ';
    const currentYear = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const customId = `DRAFT-${deptAcronym}-${currentYear}-${randomSuffix}`;
    const gazetteRef = `GSR-${randomSuffix}(E)/${currentYear}`;

    // Generate unique slug
    let baseSlug = this.quotaService.generateSlug(postTitle);
    let slug = baseSlug;
    let collisionCount = 1;
    while (await this.jobModel.findOne({ slug })) {
      slug = `${baseSlug}-draft-${randomSuffix}-${collisionCount++}`;
    }

    const vacancies =
      typeof extracted.vacancies === 'number'
        ? extracted.vacancies
        : parseInt(extracted.vacancies, 10) || 0;
    // Category breakdown: Extract from notice if explicitly given; otherwise leave 0 (no mathematical fabrication)
    const categoryBreakdown = extracted.categoryBreakdown
      ? {
          UR: Number(extracted.categoryBreakdown.UR) || 0,
          OBC: Number(extracted.categoryBreakdown.OBC) || 0,
          SC: Number(extracted.categoryBreakdown.SC) || 0,
          ST: Number(extracted.categoryBreakdown.ST) || 0,
          EWS: Number(extracted.categoryBreakdown.EWS) || 0,
        }
      : { UR: 0, OBC: 0, SC: 0, ST: 0, EWS: 0 };

    const derivedMinistry =
      dept === 'N/A' || !dept
        ? 'N/A'
        : dept.includes('UPSC')
        ? 'Central Recruiting Commission'
        : dept.includes('SSC')
        ? 'Staff Selection Board'
        : dept.includes('RRB')
        ? 'Railway Recruitment Board'
        : dept.includes('IBPS')
        ? 'Banking Personnel Board'
        : dept.includes('DRDO')
        ? 'Defence Research Org'
        : dept;

    const draft = await this.jobModel.create({
      customId,
      advtNo: extracted.advtNo || `DRAFT/${currentYear}/${randomSuffix}`,
      postTitle,
      slug,
      department: dept,
      ministryCode: derivedMinistry,
      payLevel:
        extracted.payLevel && extracted.payLevel.trim().length > 0
          ? extracted.payLevel.trim()
          : 'N/A',
      vacancies,
      categoryBreakdown,
      status: 'Pending / Scrutiny', // CRUCIAL: Draft mode, NEVER exposed on public citizen portal
      startDate: extracted.startDate || '',
      deadlineDate: extracted.deadlineDate || '',
      examDate: extracted.examDate || undefined,
      gazetteRef,
      applicationFees: extracted.applicationFees || {
        general: 0,
        obc: 0,
        scSt: 0,
        female: 0,
        paymentMode: '',
      },
      qualificationSummary: extracted.qualificationSummary || '',
      ageLimitSummary: extracted.ageLimitSummary || '',
      postBreakdown: extracted.postBreakdown || [],
      selectionStages: extracted.selectionStages || [],
      applyOnlineUrl: extracted.applyOnlineUrl || undefined,
      officialNoticePdfUrl: extracted.officialNoticePdfUrl || undefined,
      officialWebsiteUrl: extracted.officialWebsiteUrl || undefined,
      admitCardUrl: extracted.admitCardUrl || undefined,
      answerKeyUrl: extracted.answerKeyUrl || undefined,
      syllabusUrl: extracted.syllabusUrl || undefined,
      description: extracted.description || undefined,
      faqs: extracted.faqs || [],
    });

    await this.auditService.createAuditLog({
      actor: actorEmail,
      role: actorRole,
      action: 'CREATE_JOB',
      referenceId: (draft._id as unknown as string).toString(),
      statusType: draft.status,
      metadata: {
        customId: draft.customId,
        source: 'AI_DIRECT_DRAFT_AUTOSAVE',
        vacancies: draft.vacancies,
      },
    });

    return draft.toObject();
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

    const effectiveLimit = Math.min(Math.max(limit, 1), 5000);
    const skip = (page - 1) * effectiveLimit;
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      this.jobModel
        .find(filter)
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(effectiveLimit)
        .lean()
        .exec(),
      this.jobModel.countDocuments(filter).exec(),
    ]);

    const sanitizedData = data.map((item) => {
      if (item.status !== 'Pending / Scrutiny' && item.customId?.startsWith('DRAFT-')) {
        return {
          ...item,
          customId: item.customId.replace(/^DRAFT-/i, ''),
          slug: item.slug ? item.slug.replace(/-draft-[0-9]+/gi, '') : item.slug,
        };
      }
      return item;
    });

    return {
      data: sanitizedData,
      meta: {
        total,
        page,
        limit: effectiveLimit,
        totalPages: Math.ceil(total / effectiveLimit),
      },
    };
  }

  // ─── FIND ONE BY ID OR SLUG ───────────────────────────────────────────────

  private getLookupFilter(idOrCustomId: string): FilterQuery<JobDocument> {
    const raw = idOrCustomId.trim();
    const withoutDraft = raw.replace(/^DRAFT-/i, '');
    const withDraft = `DRAFT-${withoutDraft}`;

    const matchConditions: FilterQuery<JobDocument>[] = [
      { customId: raw },
      { customId: withoutDraft },
      { customId: withDraft },
      { advtNo: raw },
      { slug: raw.toLowerCase() },
      { slug: raw.toLowerCase().replace(/-draft-[0-9]+/gi, '') },
    ];

    if (mongoose.isValidObjectId(raw)) {
      matchConditions.unshift({ _id: raw });
    }

    return { $or: matchConditions };
  }

  async findById(id: string) {
    const filter = this.getLookupFilter(id);
    const job = await this.jobModel.findOne(filter).lean().exec();
    if (!job) throw new NotFoundException(`Job not found with id or customId: ${id}`);
    if (job.status !== 'Pending / Scrutiny' && job.customId?.startsWith('DRAFT-')) {
      job.customId = job.customId.replace(/^DRAFT-/i, '');
      if (job.slug) job.slug = job.slug.replace(/-draft-[0-9]+/gi, '');
    }
    return job;
  }

  async findBySlug(slug: string) {
    const filter = this.getLookupFilter(slug);
    const job = await this.jobModel.findOne(filter).lean().exec();
    if (!job) throw new NotFoundException(`Job not found with slug or customId: ${slug}`);
    if (job.status !== 'Pending / Scrutiny' && job.customId?.startsWith('DRAFT-')) {
      job.customId = job.customId.replace(/^DRAFT-/i, '');
      if (job.slug) job.slug = job.slug.replace(/-draft-[0-9]+/gi, '');
    }
    return job;
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateJobDto, actorEmail: string, actorRole: string) {
    const filter = this.getLookupFilter(id);
    const existing = await this.jobModel.findOne(filter);
    if (!existing) throw new NotFoundException(`Job not found with id or customId: ${id}`);

    const updatePayload: Partial<Job> = { ...dto } as Partial<Job>;

    // When publishing or updating a live job, promote customId so citizens & visitors
    // never see internal DRAFT- prefixes on the portal
    const targetStatus = dto.status ?? existing.status;
    const isLive = targetStatus !== 'Pending / Scrutiny';

    if (isLive && existing.customId && existing.customId.startsWith('DRAFT-')) {
      updatePayload.customId = existing.customId.replace(/^DRAFT-/i, '');
      if (existing.slug) {
        updatePayload.slug = existing.slug.replace(/-draft-[0-9]+/gi, '');
      }
    }

    // If categoryBreakdown is explicitly provided, update it directly
    if (dto.categoryBreakdown) {
      updatePayload.categoryBreakdown = {
        UR: dto.categoryBreakdown.UR ?? existing.categoryBreakdown?.UR ?? 0,
        OBC: dto.categoryBreakdown.OBC ?? existing.categoryBreakdown?.OBC ?? 0,
        SC: dto.categoryBreakdown.SC ?? existing.categoryBreakdown?.SC ?? 0,
        ST: dto.categoryBreakdown.ST ?? existing.categoryBreakdown?.ST ?? 0,
        EWS: dto.categoryBreakdown.EWS ?? existing.categoryBreakdown?.EWS ?? 0,
      };
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

    this.invalidatePublicCache();
    return updated;
  }

  // ─── DELETE ───────────────────────────────────────────────────────────────

  async delete(id: string, actorEmail: string, actorRole: string) {
    const filter = this.getLookupFilter(id);
    const existing = await this.jobModel.findOne(filter);
    if (!existing) throw new NotFoundException(`Job not found with id or customId: ${id}`);

    await this.jobModel.deleteOne(filter).exec();

    await this.auditService.createAuditLog({
      actor: actorEmail,
      role: actorRole,
      action: 'DELETE_JOB',
      referenceId: (existing._id as unknown as string).toString(),
      statusType: existing.status,
      metadata: { customId: existing.customId, postTitle: existing.postTitle },
    });

    this.invalidatePublicCache();
    return { success: true, message: `Requisition ${existing.customId} deleted successfully` };
  }
}
