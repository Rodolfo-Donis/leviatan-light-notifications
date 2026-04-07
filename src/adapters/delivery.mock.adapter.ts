import { mockCriticalDeliveries, mockDeliveryTracking } from "../data/deliveries.mock.js";
import type { AdapterTimingConfig, CriticalDelivery, DeliveryPort, DeliveryTracking } from "../domain/types.js";

// n8n: Replace with real HTTP call to Ariba/Coupa endpoint: /logistics/v1/shipments
// n8n: Replace with real HTTP call to Ariba/Coupa endpoint: /api/shipments/v1/tracking

async function executeMockDelay(config: AdapterTimingConfig): Promise<void> {
  if (!config.enableMockDelay) return;
  await new Promise<void>((resolve) => setTimeout(resolve, config.mockDelayMs));
}

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
