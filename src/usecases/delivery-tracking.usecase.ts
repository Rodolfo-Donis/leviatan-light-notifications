import type { DeliveryPort, DeliveryTracking, DeliveryTrackingQuery } from "../domain/types.js";

export class DeliveryTrackingUseCase {
  public constructor(private readonly deliveryPort: DeliveryPort) {}

  public async execute(input: DeliveryTrackingQuery): Promise<readonly DeliveryTracking[]> {
    const rows = await this.deliveryPort.fetchDeliveryTracking();
    const tenantRows = rows.filter((r) => r.clientId === input.clientId);
    const poSet = new Set(
      input.poNumbers
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    );
    const matched = tenantRows.filter((r) => poSet.has(r.poNumber));
    if (input.demo) {
      const delayed = matched.find((r) => r.status === "DELAYED");
      const customs = matched.find((r) => r.status === "CUSTOMS");
      const demo: DeliveryTracking[] = [];
      if (delayed !== undefined) demo.push(delayed);
      if (customs !== undefined && !demo.some((d) => d.trackingId === customs.trackingId)) demo.push(customs);
      for (const r of matched) {
        if (demo.length >= 6) break;
        if (!demo.some((d) => d.trackingId === r.trackingId)) demo.push(r);
      }
      return demo.slice(0, 6);
    }
    return matched;
  }
}
