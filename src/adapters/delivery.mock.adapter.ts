import { mockCriticalDeliveries, mockDeliveryTracking } from "../data/deliveries.mock.js";
import type { AdapterTimingConfig, CriticalDelivery, DeliveryPort, DeliveryTracking } from "../domain/types.js";
import { executeMockDelay } from "../utilities/execute-mock-delay.js";

// n8n: Replace with real HTTP call to Ariba/Coupa endpoint: /logistics/v1/shipments
// n8n: Replace with real HTTP call to Ariba/Coupa endpoint: /api/shipments/v1/tracking

export class DeliveryMockAdapter implements DeliveryPort {
  public constructor(private readonly timing: AdapterTimingConfig) {}

  public async fetchCriticalDeliveries(): Promise<readonly CriticalDelivery[]> {
    await executeMockDelay(this.timing);
    return mockCriticalDeliveries;
  }

  public async fetchDeliveryTracking(): Promise<readonly DeliveryTracking[]> {
    await executeMockDelay(this.timing);
    return mockDeliveryTracking;
  }
}
