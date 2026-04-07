import { mockSupplierRisks, mockSuppliersOnboarding } from "../data/suppliers.mock.js";
import type { AdapterTimingConfig, SupplierPort, SupplierOnboarding, SupplierRisk } from "../domain/types.js";

// n8n: Replace with real HTTP call to Ariba/Coupa endpoint: /api/supplierdataprocessing/v1/prod/suppliers
// n8n: Replace with real HTTP call to Ariba/Coupa endpoint: /api/supplier/v1/suppliers

async function executeMockDelay(config: AdapterTimingConfig): Promise<void> {
  if (!config.enableMockDelay) return;
  await new Promise<void>((resolve) => setTimeout(resolve, config.mockDelayMs));
}

export class SupplierMockAdapter implements SupplierPort {
  public constructor(private readonly timing: AdapterTimingConfig) {}

  public async fetchOnboardingSuppliers(): Promise<readonly SupplierOnboarding[]> {
    await executeMockDelay(this.timing);
    return mockSuppliersOnboarding;
  }

  public async fetchSupplierRisks(): Promise<readonly SupplierRisk[]> {
    await executeMockDelay(this.timing);
    return mockSupplierRisks;
  }
}
