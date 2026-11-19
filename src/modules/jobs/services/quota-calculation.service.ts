import { Injectable } from '@nestjs/common';
import { CategoryBreakdown } from '../schemas/job.schema';

/**
 * Indian Statutory Reservation Quota Engine
 *
 * Quota percentages per Indian Constitution & OBC Commission mandate:
 *   OBC  → 27.0%
 *   SC   → 15.0%
 *   ST   →  7.5%
 *   EWS  → 10.0%
 *   UR   → Residual (total − sum of reserved categories) ≈ 40.5%
 *
 * The UR figure is computed as residual (not a fixed %) to guarantee:
 *   UR + OBC + SC + ST + EWS === total (integer arithmetic, no remainder lost)
 */
@Injectable()
export class QuotaCalculationService {
  /**
   * Compute statutory category breakdown for a given total vacancy count.
   * Uses Math.round for each reserved category; UR absorbs any rounding difference.
   *
   * @param total - Total advertised vacancies (must be >= 1)
   * @returns CategoryBreakdown with guaranteed sum === total
   */
  computeQuotas(total: number): CategoryBreakdown {
    if (total < 1) {
      return { UR: 0, OBC: 0, SC: 0, ST: 0, EWS: 0 };
    }

    const obc = Math.round(total * 0.27);   // 27%
    const sc  = Math.round(total * 0.15);   // 15%
    const st  = Math.round(total * 0.075);  // 7.5%
    const ews = Math.round(total * 0.10);   // 10%
    const ur  = total - (obc + sc + st + ews); // residual → UR (≈40.5%)

    return { UR: ur, OBC: obc, SC: sc, ST: st, EWS: ews };
  }

  /**
   * Verify that a given CategoryBreakdown sums exactly to the total.
   * Used for data integrity assertions.
   */
  validateSum(breakdown: CategoryBreakdown, total: number): boolean {
    const sum = breakdown.UR + breakdown.OBC + breakdown.SC + breakdown.ST + breakdown.EWS;
    return sum === total;
  }

  /**
   * Generate a URL-safe slug from a post title.
   * e.g. "Civil Services (Preliminary) Examination 2026" → "civil-services-preliminary-examination-2026"
   */
  generateSlug(postTitle: string): string {
    return postTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')   // remove special chars
      .replace(/\s+/g, '-')           // spaces → hyphens
      .replace(/-+/g, '-')            // collapse multiple hyphens
      .replace(/^-|-$/g, '');         // trim leading/trailing hyphens
  }
}
