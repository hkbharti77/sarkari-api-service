import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Response } from 'express';
import { Job, JobDocument } from '../../jobs/schemas/job.schema';
import {
  CandidateDossier,
  CandidateDossierDocument,
} from '../../scrutiny/schemas/candidate-dossier.schema';

export interface CsvExportQuery {
  type: 'requisitions' | 'candidates';
  advtId?: string;
  status?: string;
}

function escapeCsvField(field: unknown): string {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

@Injectable()
export class CsvExportService {
  constructor(
    @InjectModel(Job.name)
    private readonly jobModel: Model<JobDocument>,

    @InjectModel(CandidateDossier.name)
    private readonly dossierModel: Model<CandidateDossierDocument>,
  ) {}

  async streamCsvExport(query: CsvExportQuery, res: Response): Promise<void> {
    const { type, advtId, status } = query;

    if (type !== 'requisitions' && type !== 'candidates') {
      throw new BadRequestException('Query "type" must be either "requisitions" or "candidates"');
    }

    const filename = `${type}-export-${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write UTF-8 BOM so Excel opens Hindi / special characters correctly
    res.write('\uFEFF');

    if (type === 'requisitions') {
      const filter: FilterQuery<JobDocument> = {};
      if (status) filter.status = status;
      if (advtId) filter.$or = [{ customId: advtId }, { advtNo: advtId }];

      // CSV Header for Requisitions
      const headers = [
        'Custom ID',
        'Advertisement No',
        'Post Title',
        'Department',
        'Ministry Code',
        'Pay Level',
        'Vacancies',
        'UR',
        'OBC',
        'SC',
        'ST',
        'EWS',
        'Deadline Date',
        'Exam Date',
        'Status',
        'Gazette Ref',
        'Official URL',
      ];
      res.write(headers.map(escapeCsvField).join(',') + '\r\n');

      const cursor = this.jobModel.find(filter).lean().cursor();

      for await (const job of cursor) {
        const row = [
          job.customId,
          job.advtNo,
          job.postTitle,
          job.department,
          job.ministryCode,
          job.payLevel,
          job.vacancies,
          job.categoryBreakdown?.UR ?? 0,
          job.categoryBreakdown?.OBC ?? 0,
          job.categoryBreakdown?.SC ?? 0,
          job.categoryBreakdown?.ST ?? 0,
          job.categoryBreakdown?.EWS ?? 0,
          job.deadlineDate,
          job.examDate ?? '',
          job.status,
          job.gazetteRef,
          job.officialWebsiteUrl,
        ];
        res.write(row.map(escapeCsvField).join(',') + '\r\n');
      }

      res.end();
    } else {
      // type === 'candidates'
      const filter: FilterQuery<CandidateDossierDocument> = {};
      if (advtId) filter.appliedAdvtId = advtId;
      if (status) filter.status = status;

      // CSV Header for Candidates
      const headers = [
        'Roll Number',
        'Registration ID',
        'Full Name',
        'Date of Birth',
        'Age',
        'Category',
        'Applied Advt ID',
        'Applied Post',
        'Department',
        'Exam Center Code',
        'Written Score',
        'Status',
        'Submitted At',
        'Verified By',
        'Verified At',
        'Scrutiny Remarks',
      ];
      res.write(headers.map(escapeCsvField).join(',') + '\r\n');

      const cursor = this.dossierModel.find(filter).lean().cursor();

      for await (const c of cursor) {
        const row = [
          c.rollNumber,
          c.registrationId,
          c.fullName,
          c.dateOfBirth,
          c.ageYears,
          c.category,
          c.appliedAdvtId,
          c.appliedPost,
          c.department,
          c.examCenterCode,
          c.writtenScore !== null && c.writtenScore !== undefined ? c.writtenScore : '',
          c.status,
          c.submittedAt,
          c.verifiedBy ?? '',
          c.verifiedAt ? new Date(c.verifiedAt).toISOString() : '',
          c.scrutinyRemarks ?? '',
        ];
        res.write(row.map(escapeCsvField).join(',') + '\r\n');
      }

      res.end();
    }
  }
}
