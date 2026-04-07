import type { ContractPort, ExpiringContract, ExpiringContractsQuery } from "../domain/types.js";

function parseIsoDate(value: string): number {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid ISO date: ${value}`);
  }
  return ms;
}

export class ContractsExpiringUseCase {
  public constructor(private readonly contractPort: ContractPort) {}

  public async execute(input: ExpiringContractsQuery): Promise<readonly ExpiringContract[]> {
    const rows = await this.contractPort.fetchExpiringContracts();
    const tenantRows = rows.filter((r) => r.clientId === input.clientId);
    if (input.demo) {
      const autoRenew = tenantRows.filter((r) => r.autoRenew);
      const highSpend = [...tenantRows].sort((a, b) => b.spendYTD - a.spendYTD)[0];
      const demo: ExpiringContract[] = [];
      if (highSpend !== undefined) demo.push(highSpend);
      for (const r of autoRenew) {
        if (demo.length >= 5) break;
        if (!demo.some((d) => d.contractId === r.contractId)) demo.push(r);
      }
      const rest = tenantRows.filter((r) => !demo.some((d) => d.contractId === r.contractId));
      for (const r of rest) {
        if (demo.length >= 6) break;
        demo.push(r);
      }
      return demo.slice(0, 6);
    }
    const nowMs = Date.now();
    const horizonMs = input.daysUntilExpiry * 86_400_000;
    return tenantRows.filter((r) => {
      const expiryMs = parseIsoDate(r.expiryDate);
      const delta = expiryMs - nowMs;
      return delta >= 0 && delta <= horizonMs;
    });
  }
}
