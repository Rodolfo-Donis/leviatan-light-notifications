import type { POApproval, POApprovalsQuery, PurchaseOrderPort } from "../domain/types.js";

export class POApprovalsUseCase {
  public constructor(private readonly purchaseOrderPort: PurchaseOrderPort) {}

  public async execute(input: POApprovalsQuery): Promise<readonly POApproval[]> {
    const rows = await this.purchaseOrderPort.fetchPOApprovals();
    const tenantRows = rows.filter((r) => r.clientId === input.clientId);
    if (input.demo) {
      const highEscalation = [...tenantRows].sort((a, b) => b.escalationLevel - a.escalationLevel)[0];
      const demo: POApproval[] = [];
      if (highEscalation !== undefined) demo.push(highEscalation);
      const rest = tenantRows.filter((r) => r.approvalId !== highEscalation?.approvalId);
      for (const r of rest) {
        if (demo.length >= 5) break;
        demo.push(r);
      }
      return demo.slice(0, 5);
    }
    let filtered = tenantRows;
    if (input.pendingFor !== undefined && input.pendingFor.trim().length > 0) {
      const needle = input.pendingFor.trim().toLowerCase();
      filtered = filtered.filter((r) => r.currentApprover.toLowerCase().includes(needle));
    }
    const amountGte = input.amountGte;
    if (amountGte !== undefined) {
      filtered = filtered.filter((r) => r.amount >= amountGte);
    }
    return filtered;
  }
}
