import type { ReceivingTask, ReceivingTasksQuery, WarehousePort } from "../domain/types.js";

function parseIsoDate(value: string): number {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid ISO date: ${value}`);
  }
  return ms;
}

export class ReceivingTasksUseCase {
  public constructor(private readonly warehousePort: WarehousePort) {}

  public async execute(input: ReceivingTasksQuery): Promise<readonly ReceivingTask[]> {
    const rows = await this.warehousePort.fetchReceivingTasks();
    const tenantRows = rows.filter((r) => r.clientId === input.clientId);
    if (input.demo) {
      const partial = tenantRows.find((r) => r.status === "PARTIAL");
      const expected = tenantRows.find((r) => r.status === "EXPECTED");
      const demo: ReceivingTask[] = [];
      if (partial !== undefined) demo.push(partial);
      if (expected !== undefined && !demo.some((d) => d.receiptId === expected.receiptId)) demo.push(expected);
      const rest = tenantRows.filter((r) => !demo.some((d) => d.receiptId === r.receiptId));
      for (const r of rest) {
        if (demo.length >= 6) break;
        demo.push(r);
      }
      return demo.slice(0, 6);
    }
    let filtered = tenantRows;
    if (input.expectedDateStart !== undefined) {
      const fromMs = parseIsoDate(input.expectedDateStart);
      filtered = filtered.filter((r) => parseIsoDate(r.expectedArrival) >= fromMs);
    }
    if (input.expectedDateEnd !== undefined) {
      const toMs = parseIsoDate(input.expectedDateEnd);
      filtered = filtered.filter((r) => parseIsoDate(r.expectedArrival) <= toMs);
    }
    return filtered;
  }
}
