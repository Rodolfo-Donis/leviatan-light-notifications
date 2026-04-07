import type { SupplierOnboarding, SupplierOnboardingQuery, SupplierPort } from "../domain/types.js";

function pickUniqueByStatus(
  rows: readonly SupplierOnboarding[],
  status: SupplierOnboarding["status"],
): SupplierOnboarding | undefined {
  return rows.find((r) => r.status === status);
}

export class SupplierOnboardingUseCase {
  public constructor(private readonly supplierPort: SupplierPort) {}

  public async execute(input: SupplierOnboardingQuery): Promise<readonly SupplierOnboarding[]> {
    const rows = await this.supplierPort.fetchOnboardingSuppliers();
    const tenantRows = rows.filter((r) => r.clientId === input.clientId);
    if (input.demo) {
      const demo: SupplierOnboarding[] = [];
      const inProgress = pickUniqueByStatus(tenantRows, "IN_PROGRESS");
      const awaiting = pickUniqueByStatus(tenantRows, "AWAITING_APPROVAL");
      const rejected = pickUniqueByStatus(tenantRows, "REJECTED");
      if (inProgress !== undefined) demo.push(inProgress);
      if (awaiting !== undefined) demo.push(awaiting);
      if (rejected !== undefined) demo.push(rejected);
      const rest = tenantRows.filter((r) => !demo.some((d) => d.id === r.id));
      for (const r of rest) {
        if (demo.length >= Math.min(6, input.limit)) break;
        demo.push(r);
      }
      return demo.slice(0, Math.min(6, input.limit));
    }
    let filtered = tenantRows;
    if (input.status !== undefined) {
      filtered = filtered.filter((r) => r.status === input.status);
    }
    return filtered.slice(0, input.limit);
  }
}
