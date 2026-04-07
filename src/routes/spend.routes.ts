import type { FastifyInstance } from "fastify";
import type { SpendController } from "../controllers/spend.controller.js";

export function registerSpendRoutes(app: FastifyInstance, controller: SpendController): void {
  app.get("/spend/analytics", (request, reply) => controller.handleAnalytics(request, reply));
}
