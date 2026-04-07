import { mockSpendAnalytics } from "../data/spend.mock.js";
import type { AdapterTimingConfig, SpendAnalyticRow, SpendPort } from "../domain/types.js";

// n8n: Replace with real HTTP call to Ariba/Coupa endpoint: /reporting/v1/spendAnalytics
// n8n: Replace with real HTTP call to Ariba/Coupa endpoint: /api/analytics/v1/spend

async function executeMockDelay(config: AdapterTimingConfig): Promise<void> {
  if (!config.enableMockDelay) return;
  await new Promise<void>((resolve) => setTimeout(resolve, config.mockDelayMs));
}

export class SpendMockAdapter implements SpendPort {
  public constructor(private readonly timing: AdapterTimingConfig) {}

  public async fetchSpendAnalytics(): Promise<readonly SpendAnalyticRow[]> {
    await executeMockDelay(this.timing);
    return mockSpendAnalytics;
  }
}
