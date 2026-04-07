import { mockPickingTasks, mockReceivingTasks } from "../data/warehouse.mock.js";
import type { AdapterTimingConfig, PickingTask, ReceivingTask, WarehousePort } from "../domain/types.js";

// n8n: Replace with real HTTP call to Ariba/Coupa endpoint: /receiving/v1/receipts
// n8n: Replace with real HTTP call to Ariba/Coupa endpoint: /wms/v1/pickingTasks

async function executeMockDelay(config: AdapterTimingConfig): Promise<void> {
  if (!config.enableMockDelay) return;
  await new Promise<void>((resolve) => setTimeout(resolve, config.mockDelayMs));
}

export class WarehouseMockAdapter implements WarehousePort {
  public constructor(private readonly timing: AdapterTimingConfig) {}

  public async fetchPickingTasks(): Promise<readonly PickingTask[]> {
    await executeMockDelay(this.timing);
    return mockPickingTasks;
  }

  public async fetchReceivingTasks(): Promise<readonly ReceivingTask[]> {
    await executeMockDelay(this.timing);
    return mockReceivingTasks;
  }
}
