import type { FastifyInstance } from "fastify";
import type { DeliveryController } from "../controllers/delivery.controller.js";

export function registerDeliveryRoutes(app: FastifyInstance, controller: DeliveryController): void {
  app.get("/deliveries/critical", (request, reply) => controller.handleCritical(request, reply));
  app.get("/deliveries/tracking", (request, reply) => controller.handleTracking(request, reply));
}
