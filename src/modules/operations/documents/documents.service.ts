import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import {
  JobDocument,
  JobDocumentDocument,
} from './schemas/job-document.schema';
import { Job, JobDocument as JobModelDocument } from '../../jobs/schemas/job.schema';
import { AuditService } from '../../auth/audit/audit.service';

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

@Injectable()
export class DocumentsService {
  private readonly uploadDir: string;

  constructor(
    @InjectModel(JobDocument.name)
    private readonly jobDocModel: Model<JobDocumentDocument>,

    @InjectModel(Job.name)
    private readonly jobModel: Model<JobModelDocument>,

    private readonly auditService: AuditService,
  ) {
    this.uploadDir = path.resolve(process.cwd(), 'uploads', 'documents');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadJobNoticePdf(
    jobId: string,
    file: Express.Multer.File,
    actorEmail: string,
    actorRole: string,
  ): Promise<Record<string, unknown>> {
    if (!file) {
      throw new BadRequestException('No file uploaded. Please attach a PDF document.');
    }

    // 1. Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File size exceeds 15MB limit. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
      );
    }

    // 2. Validate MIME type
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException(
        `Invalid file type "${file.mimetype}". Only application/pdf files are permitted.`,
      );
    }

    // 3. Magic Number Header Check: First 4 bytes must be "%PDF" (0x25 0x50 0x44 0x46)
    const header = file.buffer.slice(0, 4).toString('ascii');
    if (!header.startsWith('%PDF')) {
      throw new BadRequestException(
        'File corrupt or spoofed. Magic number does not match PDF signature (%PDF).',
      );
    }

    // 4. Validate Job exists
    const job = await this.jobModel.findOne({
      $or: [{ customId: jobId }, { _id: jobId.match(/^[0-9a-fA-F]{24}$/) ? jobId : null }],
    });

    if (!job) {
      throw new NotFoundException(`Notification not found with ID: ${jobId}`);
    }

    // 5. Compute SHA-256 Checksum
    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // 6. Generate unique filename and write to disk
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${job.customId}-${uniqueSuffix}-${sanitizedFilename}`;
    const storagePath = path.join(this.uploadDir, filename);

    fs.writeFileSync(storagePath, file.buffer);

    const publicUrl = `/api/v1/public/documents/${filename}`;

    // 7. Store document record
    const docRecord = await this.jobDocModel.create({
      jobId: job.customId,
      originalFilename: file.originalname,
      storageKey: storagePath,
      contentType: file.mimetype,
      sizeBytes: file.size,
      checksum,
      uploadedBy: actorEmail,
    });

    // 8. Attach PDF URL to Job
    job.officialNoticePdfUrl = publicUrl;
    await job.save();

    // 9. Audit log
    await this.auditService.createAuditLog({
      actor: actorEmail,
      role: actorRole,
      action: 'UPLOAD_JOB_NOTICE_PDF',
      referenceId: job.customId,
      statusType: job.status,
      metadata: {
        documentId: (docRecord._id as unknown as string).toString(),
        filename: file.originalname,
        sizeBytes: file.size,
        checksum,
      },
    });

    return {
      message: 'Official notification PDF uploaded and attached successfully',
      document: {
        id: docRecord._id,
        jobId: job.customId,
        originalFilename: file.originalname,
        url: publicUrl,
        sizeBytes: file.size,
        checksum,
      },
      job: {
        customId: job.customId,
        officialNoticePdfUrl: job.officialNoticePdfUrl,
      },
    };
  }
}
