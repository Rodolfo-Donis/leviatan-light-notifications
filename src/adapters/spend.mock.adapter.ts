import { mockSpendAnalytics } from "../data/spend.mock.js";
import type { AdapterTimingConfig, SpendAnalyticRow, SpendPort } from "../domain/types.js";
import { executeMockDelay } from "../utilities/execute-mock-delay.js";

// n8n: Replace with real HTTP call to Ariba/Coupa endpoint: /reporting/v1/spendAnalytics
// n8n: Replace with real HTTP call to Ariba/Coupa endpoint: /api/analytics/v1/spend

export class SpendMockAdapter implements SpendPort {
  public constructor(private readonly timing: AdapterTimingConfig) {}

  public async fetchSpendAnalytics(): Promise<readonly SpendAnalyticRow[]> {
    await executeMockDelay(this.timing);
    return mockSpendAnalytics;
  }
}
