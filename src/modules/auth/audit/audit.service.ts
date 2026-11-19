import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../schemas/audit-log.schema';

export interface CreateAuditLogParams {
  actor: string;
  role: string;
  action: string;
  referenceId?: string;
  statusType?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  /**
   * Record an audit event. Fire-and-forget — never throws.
   */
  async createAuditLog(params: CreateAuditLogParams): Promise<void> {
    try {
      await this.auditLogModel.create({
        timestamp: new Date(),
        actor: params.actor,
        role: params.role,
        action: params.action,
        referenceId: params.referenceId ?? null,
        statusType: params.statusType ?? null,
        metadata: params.metadata ?? {},
      });
    } catch (err) {
      // Log but never crash the caller
      console.error('[AuditService] Failed to write audit log:', err);
    }
  }

  /**
   * Retrieve audit logs with optional filters.
   */
  async findAll(filters: {
    actor?: string;
    action?: string;
    referenceId?: string;
    page?: number;
    limit?: number;
  }) {
    const { actor, action, referenceId, page = 1, limit = 50 } = filters;
    const query: Record<string, unknown> = {};

    if (actor) query['actor'] = actor;
    if (action) query['action'] = action;
    if (referenceId) query['referenceId'] = referenceId;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.auditLogModel
        .find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.auditLogModel.countDocuments(query).exec(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
