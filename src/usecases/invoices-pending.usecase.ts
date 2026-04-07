import type { InvoicePort, PendingInvoice, PendingInvoicesQuery } from "../domain/types.js";

function parseIsoDate(value: string): number {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid ISO date: ${value}`);
  }
  return ms;
}

export class InvoicesPendingUseCase {
  public constructor(private readonly invoicePort: InvoicePort) {}

  public async execute(input: PendingInvoicesQuery): Promise<readonly PendingInvoice[]> {
    const rows = await this.invoicePort.fetchPendingInvoices();
    const tenantRows = rows.filter((r) => r.clientId === input.clientId);
    if (input.demo) {
      const exception = tenantRows.find((r) => r.matchStatus === "EXCEPTION");
      const threeWay = tenantRows.find((r) => r.matchStatus === "3WAY");
      const demo: PendingInvoice[] = [];
      if (exception !== undefined) demo.push(exception);
      if (threeWay !== undefined && !demo.some((d) => d.invoiceId === threeWay.invoiceId)) demo.push(threeWay);
      const rest = tenantRows.filter((r) => !demo.some((d) => d.invoiceId === r.invoiceId));
      for (const r of rest) {
        if (demo.length >= 6) break;
        demo.push(r);
      }
      return demo.slice(0, 6);
    }
    let filtered = tenantRows;
    if (input.matchStatus !== undefined) {
      filtered = filtered.filter((r) => r.matchStatus === input.matchStatus);
    }
    if (input.dueDateStart !== undefined) {
      const fromMs = parseIsoDate(input.dueDateStart);
      filtered = filtered.filter((r) => parseIsoDate(r.dueDate) >= fromMs);
    }
    return filtered;
  }
}
