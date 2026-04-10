import { mockSupplierRisks, mockSuppliersOnboarding } from "../data/suppliers.mock.js";
import type { AdapterTimingConfig, SupplierPort, SupplierOnboarding, SupplierRisk } from "../domain/types.js";
import { executeMockDelay } from "../utilities/execute-mock-delay.js";

// n8n: Replace with real HTTP call to Ariba/Coupa endpoint: /api/supplierdataprocessing/v1/prod/suppliers
// n8n: Replace with real HTTP call to Ariba/Coupa endpoint: /api/supplier/v1/suppliers

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
