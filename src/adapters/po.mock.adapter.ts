import { mockPOApprovals, mockPurchaseOrders } from "../data/purchase-orders.mock.js";
import type { AdapterTimingConfig, POApproval, PurchaseOrder, PurchaseOrderPort } from "../domain/types.js";
import { executeMockDelay } from "../utilities/execute-mock-delay.js";

// n8n: Replace with real HTTP call to Ariba/Coupa endpoint: /purchase-orders/v1/purchaseOrders
// n8n: Replace with real HTTP call to Ariba/Coupa endpoint: /api/purchase_order/v1/purchase_orders

export class POMockAdapter implements PurchaseOrderPort {
  public constructor(private readonly timing: AdapterTimingConfig) {}

  public async fetchPurchaseOrders(): Promise<readonly PurchaseOrder[]> {
    await executeMockDelay(this.timing);
    return mockPurchaseOrders;
  }

  public async fetchPOApprovals(): Promise<readonly POApproval[]> {
    await executeMockDelay(this.timing);
    return mockPOApprovals;
  }
}
