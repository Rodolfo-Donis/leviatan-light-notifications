import type { SupplierPort, SupplierRisk, SupplierRiskQuery } from "../domain/types.js";

export class SupplierRiskUseCase {
  public constructor(private readonly supplierPort: SupplierPort) {}

  public async execute(input: SupplierRiskQuery): Promise<readonly SupplierRisk[]> {
    const rows = await this.supplierPort.fetchSupplierRisks();
    const tenantRows = rows.filter((r) => r.clientId === input.clientId);
    if (input.demo) {
      const high = tenantRows.find((r) => r.riskLevel === "HIGH");
      const medium = tenantRows.find((r) => r.riskLevel === "MEDIUM");
      const low = tenantRows.find((r) => r.riskLevel === "LOW");
      const nonCompliant = tenantRows.find((r) => r.complianceStatus === "NON_COMPLIANT");
      const demo: SupplierRisk[] = [];
      if (high !== undefined) demo.push(high);
      if (nonCompliant !== undefined && !demo.some((d) => d.supplierId === nonCompliant.supplierId)) {
        demo.push(nonCompliant);
      }
      if (medium !== undefined) demo.push(medium);
      if (low !== undefined) demo.push(low);
      const rest = tenantRows.filter((r) => !demo.some((d) => d.supplierId === r.supplierId));
      for (const r of rest) {
        if (demo.length >= 6) break;
        demo.push(r);
      }
      return demo.slice(0, 6);
    }
    let filtered = tenantRows;
    if (input.riskLevel !== undefined) {
      filtered = filtered.filter((r) => r.riskLevel === input.riskLevel);
    }
    if (input.complianceStatus !== undefined) {
      filtered = filtered.filter((r) => r.complianceStatus === input.complianceStatus);
    }
    return filtered;
  }
}
