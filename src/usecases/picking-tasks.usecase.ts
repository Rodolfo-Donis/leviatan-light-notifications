import type { PickingTask, PickingTasksQuery, WarehousePort } from "../domain/types.js";

export class PickingTasksUseCase {
  public constructor(private readonly warehousePort: WarehousePort) {}

  public async execute(input: PickingTasksQuery): Promise<readonly PickingTask[]> {
    const rows = await this.warehousePort.fetchPickingTasks();
    const tenantRows = rows.filter((r) => r.clientId === input.clientId);
    if (input.demo) {
      const high = tenantRows.find((r) => r.priority === "HIGH");
      const inProgress = tenantRows.find((r) => r.status === "IN_PROGRESS");
      const demo: PickingTask[] = [];
      if (high !== undefined) demo.push(high);
      if (inProgress !== undefined && !demo.some((d) => d.taskId === inProgress.taskId)) demo.push(inProgress);
      const rest = tenantRows.filter((r) => !demo.some((d) => d.taskId === r.taskId));
      for (const r of rest) {
        if (demo.length >= 6) break;
        demo.push(r);
      }
      return demo.slice(0, 6);
    }
    let filtered = tenantRows;
    if (input.priority !== undefined) {
      filtered = filtered.filter((r) => r.priority === input.priority);
    }
    if (input.status !== undefined) {
      filtered = filtered.filter((r) => r.status === input.status);
    }
    return filtered;
  }
}
