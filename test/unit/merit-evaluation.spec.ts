import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MeritEvaluationService } from '../../src/modules/results/services/merit-evaluation.service';
import { CandidateDossier } from '../../src/modules/scrutiny/schemas/candidate-dossier.schema';

describe('MeritEvaluationService', () => {
  let service: MeritEvaluationService;

  const mockCandidates = [
    {
      rollNumber: 'ROLL-01',
      category: 'UR',
      writtenScore: 108.5,
      status: 'Admit Card / Active',
    },
    {
      rollNumber: 'ROLL-02',
      category: 'UR',
      writtenScore: 70.0, // Fails UR cutoff (92.5)
      status: 'Admit Card / Active',
    },
    {
      rollNumber: 'ROLL-03',
      category: 'OBC',
      writtenScore: 89.5, // Passes OBC cutoff (85.0)
      status: 'Admit Card / Active',
    },
    {
      rollNumber: 'ROLL-04',
      category: 'SC',
      writtenScore: 78.5, // Exactly equals SC cutoff (78.5)
      status: 'Admit Card / Active',
    },
    {
      rollNumber: 'ROLL-05',
      category: 'ST',
      writtenScore: null, // Null score - skipped
      status: 'Pending / Scrutiny',
    },
  ];

  const mockCandidateModel = {
    find: jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockCandidates),
      }),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeritEvaluationService,
        {
          provide: getModelToken(CandidateDossier.name),
          useValue: mockCandidateModel,
        },
      ],
    }).compile();

    service = module.get<MeritEvaluationService>(MeritEvaluationService);
  });

  it('should qualify candidates who score at or above category cutoff marks', async () => {
    const cutoffs = {
      UR: 92.5,
      OBC: 85.0,
      SC: 78.5,
      ST: 70.0,
      EWS: 80.0,
    };

    const result = await service.evaluateQualifyingCandidates(
      'UPSC-CSE-2026-01',
      cutoffs,
    );

    expect(result.qualifiedCount).toBe(3); // ROLL-01 (108.5 >= 92.5), ROLL-03 (89.5 >= 85), ROLL-04 (78.5 >= 78.5)
    expect(result.qualifiedRollNumbers).toContain('ROLL-01');
    expect(result.qualifiedRollNumbers).not.toContain('ROLL-02'); // 70 < 92.5
    expect(result.qualifiedRollNumbers).toContain('ROLL-03');
    expect(result.qualifiedRollNumbers).toContain('ROLL-04');
    expect(result.categoryBreakdown.UR).toBe(1);
    expect(result.categoryBreakdown.OBC).toBe(1);
    expect(result.categoryBreakdown.SC).toBe(1);
  });
});
