import type { FastifyInstance } from "fastify";
import type { SupplierController } from "../controllers/supplier.controller.js";

export function registerSupplierRoutes(app: FastifyInstance, controller: SupplierController): void {
  app.get("/suppliers/onboarding", (request, reply) => controller.handleOnboarding(request, reply));
  app.get("/suppliers/risk-assessment", (request, reply) => controller.handleRisk(request, reply));
}
