import type { FastifyInstance } from "fastify";
import type { POController } from "../controllers/po.controller.js";

export function registerPORoutes(app: FastifyInstance, controller: POController): void {
  app.get("/purchase-orders/active", (request, reply) => controller.handleActive(request, reply));
  app.get("/purchase-orders/approvals", (request, reply) => controller.handleApprovals(request, reply));
}
