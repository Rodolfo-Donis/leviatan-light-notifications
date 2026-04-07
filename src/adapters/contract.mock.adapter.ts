import { mockExpiringContracts } from "../data/contracts.mock.js";
import type { AdapterTimingConfig, ContractPort, ExpiringContract } from "../domain/types.js";

// n8n: Replace with real HTTP call to Ariba/Coupa endpoint: /contracts/v1/contracts
// n8n: Replace with real HTTP call to Ariba/Coupa endpoint: /api/contracts/v1/contracts

async function executeMockDelay(config: AdapterTimingConfig): Promise<void> {
  if (!config.enableMockDelay) return;
  await new Promise<void>((resolve) => setTimeout(resolve, config.mockDelayMs));
}

export class ContractMockAdapter implements ContractPort {
  public constructor(private readonly timing: AdapterTimingConfig) {}

  public async fetchExpiringContracts(): Promise<readonly ExpiringContract[]> {
    await executeMockDelay(this.timing);
    return mockExpiringContracts;
  }
}
