import type { FastifyInstance } from "fastify";
import type { WarehouseController } from "../controllers/warehouse.controller.js";

export function registerWarehouseRoutes(app: FastifyInstance, controller: WarehouseController): void {
  app.get("/warehouse/picking-tasks", (request, reply) => controller.handlePicking(request, reply));
  app.get("/warehouse/receiving-tasks", (request, reply) => controller.handleReceiving(request, reply));
}
