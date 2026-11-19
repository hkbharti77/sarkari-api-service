import { QuotaCalculationService } from '../../src/modules/jobs/services/quota-calculation.service';
import { SEED_NOTIFICATIONS } from '../../src/seeds/data/initial-notifications.data';
import { SEED_CANDIDATES } from '../../src/seeds/data/initial-candidates.data';

describe('End-to-End Pipeline Verification', () => {
  const quotaService = new QuotaCalculationService();

  describe('1. Statutory Quota Verification on Seed Notifications', () => {
    it('should verify all 7 prototype notifications adhere to statutory quota rules', () => {
      for (const notif of SEED_NOTIFICATIONS) {
        const quotas = quotaService.computeQuotas(notif.vacancies);
        const sum = quotas.UR + quotas.OBC + quotas.SC + quotas.ST + quotas.EWS;
        expect(sum).toBe(notif.vacancies);
      }
    });
  });

  describe('2. Candidate Dossier 5-Point Checklist Verification', () => {
    it('should evaluate compliant dossiers correctly', () => {
      for (const candidate of SEED_CANDIDATES) {
        const coreValid =
          candidate.documents.photoSignature &&
          candidate.documents.nationalId &&
          candidate.documents.degreeCertificate &&
          candidate.documents.feeReceipt;

        const categoryValid =
          candidate.category === 'UR' || candidate.documents.categoryCertificate;

        const isCompliant = coreValid && categoryValid;

        if (candidate.status === 'Result Announced' || candidate.status === 'Admit Card / Active') {
          expect(isCompliant).toBe(true);
        }
      }
    });
  });

  describe('3. Public Data Consistency Verification', () => {
    it('should have active notifications ready for public discovery', () => {
      const active = SEED_NOTIFICATIONS.filter(
        (n) => n.status !== 'Rejected / Cancelled',
      );
      expect(active.length).toBeGreaterThan(0);

      const totalVacancies = active.reduce((acc, curr) => acc + curr.vacancies, 0);
      expect(totalVacancies).toBeGreaterThan(5000);
    });
  });
});
