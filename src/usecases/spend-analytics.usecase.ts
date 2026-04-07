import type { SpendAnalyticRow, SpendAnalyticsQuery, SpendPort } from "../domain/types.js";

function matchesPeriodBucket(row: SpendAnalyticRow, period: SpendAnalyticsQuery["period"]): boolean {
  if (period === "MONTH") {
    return /^\d{4}-\d{2}$/.test(row.period) && !row.period.includes("Q");
  }
  if (period === "QUARTER") {
    return row.period.includes("Q");
  }
  return /^\d{4}$/.test(row.period);
}

export class SpendAnalyticsUseCase {
  public constructor(private readonly spendPort: SpendPort) {}

  public async execute(input: SpendAnalyticsQuery): Promise<readonly SpendAnalyticRow[]> {
    const rows = await this.spendPort.fetchSpendAnalytics();
    const tenantRows = rows.filter((r) => r.clientId === input.clientId);
    if (input.demo) {
      const highVariance = [...tenantRows].sort((a, b) => Math.abs(b.variancePercent) - Math.abs(a.variancePercent))[0];
      const demo: SpendAnalyticRow[] = [];
      if (highVariance !== undefined) demo.push(highVariance);
      const rest = tenantRows.filter((r) => r !== highVariance);
      for (const r of rest) {
        if (demo.length >= 6) break;
        demo.push(r);
      }
      return demo.slice(0, 6);
    }
    let filtered = tenantRows.filter((r) => matchesPeriodBucket(r, input.period));
    if (input.category !== undefined && input.category.trim().length > 0) {
      const needle = input.category.trim().toLowerCase();
      filtered = filtered.filter((r) => r.category.toLowerCase().includes(needle));
    }
    return filtered;
  }
}
