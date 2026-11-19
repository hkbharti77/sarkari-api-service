import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Job, JobDocument } from '../modules/jobs/schemas/job.schema';
import {
  CandidateDossier,
  CandidateDossierDocument,
} from '../modules/scrutiny/schemas/candidate-dossier.schema';
import {
  AdminUser,
  AdminUserDocument,
  AdminRole,
} from '../modules/auth/schemas/admin-user.schema';
import {
  AuditLog,
  AuditLogDocument,
} from '../modules/auth/schemas/audit-log.schema';
import { TaxonomiesService } from '../modules/taxonomies/taxonomies.service';
import { SEED_NOTIFICATIONS } from './data/initial-notifications.data';
import { SEED_CANDIDATES, SEED_AUDIT_LOGS } from './data/initial-candidates.data';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectModel(Job.name)
    private readonly jobModel: Model<JobDocument>,

    @InjectModel(CandidateDossier.name)
    private readonly dossierModel: Model<CandidateDossierDocument>,

    @InjectModel(AdminUser.name)
    private readonly adminUserModel: Model<AdminUserDocument>,

    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,

    private readonly taxonomiesService: TaxonomiesService,
  ) {}

  async seedAll(): Promise<Record<string, unknown>> {
    this.logger.log('--- Starting Complete Master Seeding ---');

    // 1. Seed Master Taxonomies (Organizations, Categories, States)
    const taxResult = await this.taxonomiesService.seedMasterTaxonomies();
    this.logger.log('Master Taxonomies seeded');

    // 2. Seed Super Admin User
    let adminResult = 'Existing';
    const existingAdmin = await this.adminUserModel.findOne({ email: 'admin@govjob.in' });
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash('Admin@1234', 12);
      await this.adminUserModel.create({
        name: 'Super Administrator',
        email: 'admin@govjob.in',
        passwordHash,
        role: AdminRole.SUPER_ADMIN,
        isActive: true,
      });
      adminResult = 'Created: admin@govjob.in / Admin@1234';
    }

    // 3. Seed Master Requisitions (7 official notifications)
    let jobsInserted = 0;
    let jobsUpdated = 0;
    for (const notif of SEED_NOTIFICATIONS) {
      const res = await this.jobModel.findOneAndUpdate(
        { customId: notif.customId },
        { $set: notif },
        { upsert: true, new: true },
      );
      if (res) jobsInserted++;
    }
    this.logger.log(`Notifications processed: ${jobsInserted}`);

    // 4. Seed Candidate Dossiers
    let candidatesProcessed = 0;
    for (const cand of SEED_CANDIDATES) {
      await this.dossierModel.findOneAndUpdate(
        { rollNumber: cand.rollNumber },
        { $set: cand },
        { upsert: true, new: true },
      );
      candidatesProcessed++;
    }
    this.logger.log(`Candidate dossiers processed: ${candidatesProcessed}`);

    // 5. Seed Audit Logs
    let auditLogsProcessed = 0;
    for (const log of SEED_AUDIT_LOGS) {
      await this.auditLogModel.create({
        timestamp: new Date(),
        actor: log.actor,
        role: log.role,
        action: log.action,
        referenceId: log.referenceId,
        statusType: log.statusType,
        metadata: log.metadata,
      });
      auditLogsProcessed++;
    }
    this.logger.log(`Audit logs seeded: ${auditLogsProcessed}`);

    return {
      message: 'All prototype databases successfully seeded',
      taxonomies: taxResult,
      admin: adminResult,
      notificationsSeeded: jobsInserted,
      candidatesSeeded: candidatesProcessed,
      auditLogsSeeded: auditLogsProcessed,
    };
  }
}
