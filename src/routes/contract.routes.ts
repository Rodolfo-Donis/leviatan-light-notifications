import type { FastifyInstance } from "fastify";
import type { ContractController } from "../controllers/contract.controller.js";

export function registerContractRoutes(app: FastifyInstance, controller: ContractController): void {
  app.get("/contracts/expiring", (request, reply) => controller.handleExpiring(request, reply));
}
