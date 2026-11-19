import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Job, JobDocument } from '../../jobs/schemas/job.schema';
import { State, StateDocument } from '../../taxonomies/schemas/state.schema';
import { StateJobsQueryDto } from '../dto/state-jobs-query.dto';

interface StateCommission {
  name: string;
  code: string;
  website: string;
  description: string;
}

interface StateHubMetadata {
  name: string;
  code: string;
  capital: string;
  emblemUrl: string;
  officialLanguage: string;
  domicileRule: string;
  commissions: StateCommission[];
}

const STATE_METADATA_REGISTRY: Record<string, StateHubMetadata> = {
  UP: {
    name: 'Uttar Pradesh',
    code: 'UP',
    capital: 'Lucknow',
    emblemUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Seal_of_Uttar_Pradesh.svg',
    officialLanguage: 'Hindi, Urdu',
    domicileRule: 'Candidates with UP domicile certificate are eligible for state category reservation benefits (OBC/SC/ST/EWS). Non-domicile candidates are treated under UR category.',
    commissions: [
      { name: 'Uttar Pradesh Subordinate Services Selection Commission', code: 'UPSSSC', website: 'https://upsssc.gov.in', description: 'Group C & Non-Gazetted state posts' },
      { name: 'Uttar Pradesh Public Service Commission', code: 'UPPSC', website: 'https://uppsc.up.nic.in', description: 'Provincial Civil Services (PCS) & Group A/B Gazetted posts' },
      { name: 'Uttar Pradesh Police Recruitment & Promotion Board', code: 'UPPRPB', website: 'http://uppbpb.gov.in', description: 'Sub-Inspector & Police Constable cadres' },
    ],
  },
  BR: {
    name: 'Bihar',
    code: 'BR',
    capital: 'Patna',
    emblemUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e9/Emblem_of_Bihar.svg',
    officialLanguage: 'Hindi, Urdu, Maithili',
    domicileRule: 'Bihar domicile holders receive statutory vertical & horizontal reservation benefits. 35% horizontal reservation for female candidates with Bihar domicile.',
    commissions: [
      { name: 'Bihar Public Service Commission', code: 'BPSC', website: 'https://bpsc.bih.nic.in', description: 'Combined Competitive Exam (CCE) & Administrative posts' },
      { name: 'Bihar Staff Selection Commission', code: 'BSSC', website: 'https://bssc.bihar.gov.in', description: 'Inter-Level & Graduate-Level non-gazetted posts' },
      { name: 'Central Selection Board of Constable', code: 'CSBC', website: 'https://csbc.bih.nic.in', description: 'Bihar Police Constable & Fireman recruitment' },
    ],
  },
  RJ: {
    name: 'Rajasthan',
    code: 'RJ',
    capital: 'Jaipur',
    emblemUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Emblem_of_India.svg/200px-Emblem_of_India.svg.png',
    officialLanguage: 'Hindi, Rajasthani',
    domicileRule: 'Bonafide Rajasthan domicile certificate holders are eligible for SC/ST/OBC/MBC/EWS statutory quotas. Non-residents compete in open UR.',
    commissions: [
      { name: 'Rajasthan Public Service Commission', code: 'RPSC', website: 'https://rpsc.rajasthan.gov.in', description: 'RAS/RTS state civil and subordinate services' },
      { name: 'Rajasthan Staff Selection Board', code: 'RSMSSB', website: 'https://rsmssb.rajasthan.gov.in', description: 'Patwari, Junior Assistant, REET examinations' },
    ],
  },
  MP: {
    name: 'Madhya Pradesh',
    code: 'MP',
    capital: 'Bhopal',
    emblemUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Emblem_of_India.svg/200px-Emblem_of_India.svg.png',
    officialLanguage: 'Hindi',
    domicileRule: 'MP state employment portal registration (Rojgar Panjiyan) is mandatory for candidates applying for state recruitment exams.',
    commissions: [
      { name: 'Madhya Pradesh Public Service Commission', code: 'MPPSC', website: 'https://mppsc.mp.gov.in', description: 'State Services Examination & State Forest Service' },
      { name: 'MP Employees Selection Board (Vyapam)', code: 'MPESB', website: 'https://esb.mp.gov.in', description: 'Group 2/3/4 Sub-group and police constable exams' },
    ],
  },
  DL: {
    name: 'Delhi NCT',
    code: 'DL',
    capital: 'New Delhi',
    emblemUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Emblem_of_India.svg/200px-Emblem_of_India.svg.png',
    officialLanguage: 'Hindi, English, Punjabi, Urdu',
    domicileRule: 'Delhi government recruitments allow nationwide applicants; OBC benefits require certificates issued by Revenue Dept, GNCTD.',
    commissions: [
      { name: 'Delhi Subordinate Services Selection Board', code: 'DSSSB', website: 'https://dsssb.delhi.gov.in', description: 'TGT/PGT Teachers, DASSI, Junior Secretariat Assistant' },
    ],
  },
};

@Injectable()
export class StateHubsService {
  constructor(
    @InjectModel(Job.name)
    private readonly jobModel: Model<JobDocument>,

    @InjectModel(State.name)
    private readonly stateModel: Model<StateDocument>,
  ) {}

  async getStateHubData(
    stateCode: string,
    query: StateJobsQueryDto,
  ): Promise<Record<string, unknown>> {
    const code = stateCode.toUpperCase();

    // Check registry first or database
    let meta = STATE_METADATA_REGISTRY[code];
    if (!meta) {
      const dbState = await this.stateModel.findOne({ code }).lean().exec();
      if (!dbState) {
        throw new NotFoundException(`State government hub not found for code: ${code}`);
      }
      meta = {
        name: dbState.name,
        code: dbState.code,
        capital: 'State Capital',
        emblemUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Emblem_of_India.svg/200px-Emblem_of_India.svg.png',
        officialLanguage: 'Hindi, English',
        domicileRule: 'Candidates with state domicile receive reserved category quota benefits.',
        commissions: [],
      };
    }

    const { qualification, search, status, page = 1, limit = 20 } = query;

    const filter: FilterQuery<JobDocument> = {
      stateCode: { $in: [code, 'ALL'] },
      status: {
        $in: [
          'Admit Card / Active',
          'Pending / Scrutiny',
          'Result Announced',
        ],
      },
    };

    if (qualification) {
      filter.educationTier = qualification;
    }

    if (search?.trim()) {
      filter.$or = [
        { postTitle: { $regex: search.trim(), $options: 'i' } },
        { department: { $regex: search.trim(), $options: 'i' } },
        { advtNo: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (status) {
      const upperStatus = status.toUpperCase();
      if (upperStatus === 'OPEN') {
        filter.deadlineDate = { $gte: todayStr };
      } else if (upperStatus === 'CLOSED') {
        filter.deadlineDate = { $lt: todayStr };
      }
    }

    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * safeLimit;

    const [vacancies, total] = await Promise.all([
      this.jobModel
        .find(filter)
        .sort({ deadlineDate: 1, createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean()
        .exec(),
      this.jobModel.countDocuments(filter).exec(),
    ]);

    return {
      state: meta,
      vacancies: {
        data: vacancies,
        meta: {
          total,
          page: safePage,
          limit: safeLimit,
          totalPages: Math.ceil(total / safeLimit),
        },
      },
    };
  }
}
