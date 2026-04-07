import type { FastifyInstance } from "fastify";
import type { InvoiceController } from "../controllers/invoice.controller.js";

export function registerInvoiceRoutes(app: FastifyInstance, controller: InvoiceController): void {
  app.get("/invoices/pending", (request, reply) => controller.handlePending(request, reply));
}
