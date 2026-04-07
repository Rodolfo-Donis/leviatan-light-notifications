import type { PurchaseOrder, PurchaseOrderPort, PurchaseOrdersActiveQuery } from "../domain/types.js";

function parseIsoDate(value: string): number {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid ISO date: ${value}`);
  }
  return ms;
}

export class PurchaseOrdersUseCase {
  public constructor(private readonly purchaseOrderPort: PurchaseOrderPort) {}

  public async execute(input: PurchaseOrdersActiveQuery): Promise<readonly PurchaseOrder[]> {
    const rows = await this.purchaseOrderPort.fetchPurchaseOrders();
    const tenantRows = rows.filter((r) => r.clientId === input.clientId);
    if (input.demo) {
      const open = tenantRows.find((r) => r.status === "OPEN");
      const partial = tenantRows.find((r) => r.status === "PARTIALLY_RECEIVED");
      const closed = tenantRows.find((r) => r.status === "CLOSED");
      const demo: PurchaseOrder[] = [];
      if (open !== undefined) demo.push(open);
      if (partial !== undefined) demo.push(partial);
      if (closed !== undefined) demo.push(closed);
      const rest = tenantRows.filter((r) => !demo.some((d) => d.poNumber === r.poNumber));
      for (const r of rest) {
        if (demo.length >= 6) break;
        demo.push(r);
      }
      return demo.slice(0, 6);
    }
    let filtered = tenantRows;
    if (input.status !== undefined) {
      filtered = filtered.filter((r) => r.status === input.status);
    }
    if (input.fromDate !== undefined) {
      const fromMs = parseIsoDate(input.fromDate);
      filtered = filtered.filter((r) => parseIsoDate(r.createdDate) >= fromMs);
    }
    if (input.toDate !== undefined) {
      const toMs = parseIsoDate(input.toDate);
      filtered = filtered.filter((r) => parseIsoDate(r.createdDate) <= toMs);
    }
    return filtered;
  }
}
