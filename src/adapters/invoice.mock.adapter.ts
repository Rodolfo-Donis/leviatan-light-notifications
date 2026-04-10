import { mockPendingInvoices } from "../data/invoices.mock.js";
import type { AdapterTimingConfig, InvoicePort, PendingInvoice } from "../domain/types.js";
import { executeMockDelay } from "../utilities/execute-mock-delay.js";

// n8n: Replace with real HTTP call to Ariba/Coupa endpoint: /invoicing/v1/invoices
// n8n: Replace with real HTTP call to Ariba/Coupa endpoint: /api/invoices/v1/invoices

export class InvoiceMockAdapter implements InvoicePort {
  public constructor(private readonly timing: AdapterTimingConfig) {}

  public async fetchPendingInvoices(): Promise<readonly PendingInvoice[]> {
    await executeMockDelay(this.timing);
    return mockPendingInvoices;
  }
}
