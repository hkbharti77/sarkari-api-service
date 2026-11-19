import { QuotaCalculationService } from '../../src/modules/jobs/services/quota-calculation.service';

describe('QuotaCalculationService (Statutory Quota Engine)', () => {
  let service: QuotaCalculationService;

  beforeEach(() => {
    service = new QuotaCalculationService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should correctly compute 1000 vacancies: UR 405, OBC 270, SC 150, ST 75, EWS 100', () => {
    const quotas = service.computeQuotas(1000);
    expect(quotas).toEqual({
      UR: 405,
      OBC: 270,
      SC: 150,
      ST: 75,
      EWS: 100,
    });
    expect(service.validateSum(quotas, 1000)).toBe(true);
  });

  it('should correctly compute UPSC CSE 1056 vacancies with exact sum match', () => {
    const quotas = service.computeQuotas(1056);
    expect(quotas).toEqual({
      UR: 428,
      OBC: 285,
      SC: 158,
      ST: 79,
      EWS: 106,
    });
    expect(service.validateSum(quotas, 1056)).toBe(true);
  });

  it('should correctly compute RRB NTPC 3250 vacancies with exact sum match', () => {
    const quotas = service.computeQuotas(3250);
    expect(quotas).toEqual({
      UR: 1315,
      OBC: 878,
      SC: 488,
      ST: 244,
      EWS: 325,
    });
    expect(service.validateSum(quotas, 3250)).toBe(true);
  });

  it('should guarantee sum === total across 50 random vacancy values', () => {
    for (let i = 1; i <= 50; i++) {
      const vacancies = Math.floor(Math.random() * 5000) + 1;
      const quotas = service.computeQuotas(vacancies);
      const sum = quotas.UR + quotas.OBC + quotas.SC + quotas.ST + quotas.EWS;
      expect(sum).toBe(vacancies);
    }
  });

  it('should generate URL-safe slugs correctly', () => {
    const slug = service.generateSlug(
      'Civil Services (Preliminary) Examination 2026 — Group A',
    );
    expect(slug).toBe('civil-services-preliminary-examination-2026-group-a');
  });
});
