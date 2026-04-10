import { setTimeout as delay } from "node:timers/promises";
import type { AdapterTimingConfig } from "../domain/types.js";

/**
 * Waits for the configured mock delay when enabled (simulates upstream latency).
 */
export async function executeMockDelay(config: AdapterTimingConfig): Promise<void> {
  if (!config.enableMockDelay) {
    return;
  }
  await delay(config.mockDelayMs);
}
