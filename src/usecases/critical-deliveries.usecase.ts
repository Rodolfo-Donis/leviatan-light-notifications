import type { CriticalDelivery, CriticalDeliveriesQuery, DeliveryPort } from "../domain/types.js";

function getUtcWeekRange(reference: Date): { readonly startMs: number; readonly endMs: number } {
  const day = reference.getUTCDay();
  const daysFromMonday = (day + 6) % 7;
  const start = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate() - daysFromMonday),
  );
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);
  end.setUTCMilliseconds(-1);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

export class CriticalDeliveriesUseCase {
  public constructor(private readonly deliveryPort: DeliveryPort) {}

  public async execute(input: CriticalDeliveriesQuery): Promise<readonly CriticalDelivery[]> {
    const rows = await this.deliveryPort.fetchCriticalDeliveries();
    const tenantRows = rows.filter((r) => r.clientId === input.clientId);
    if (input.demo) {
      const high = tenantRows.find((r) => r.riskLevel === "HIGH");
      const overdue = tenantRows.find((r) => r.delayReason === "OVERDUE");
      const demo: CriticalDelivery[] = [];
      if (high !== undefined) demo.push(high);
      if (overdue !== undefined && !demo.some((d) => d.deliveryId === overdue.deliveryId)) demo.push(overdue);
      const rest = tenantRows.filter((r) => !demo.some((d) => d.deliveryId === r.deliveryId));
      for (const r of rest) {
        if (demo.length >= 6) break;
        demo.push(r);
      }
      return demo.slice(0, 6);
    }
    if (input.weekRange !== "current") {
      return [];
    }
    const { startMs, endMs } = getUtcWeekRange(new Date());
    return tenantRows.filter((r) => {
      const etaMs = Date.parse(r.eta);
      if (Number.isNaN(etaMs)) return false;
      return etaMs >= startMs && etaMs <= endMs;
    });
  }
}
