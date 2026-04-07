import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { buildErrorEnvelope, buildSuccessEnvelope, pendingInvoicesQuerySchema } from "../domain/types.js";
import type { InvoicesPendingUseCase } from "../usecases/invoices-pending.usecase.js";

const PENDING_ENDPOINT = "/invoices/pending";

export class InvoiceController {
  public constructor(private readonly invoicesPendingUseCase: InvoicesPendingUseCase) {}

  public async handlePending(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const parsed = pendingInvoicesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.status(400).send(
        buildErrorEnvelope({
          clientId: this.extractClientId(request.query),
          endpoint: PENDING_ENDPOINT,
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: parsed.error.flatten(),
        }),
      );
      return;
    }
    try {
      const data = await this.invoicesPendingUseCase.execute(parsed.data);
      reply.send(
        buildSuccessEnvelope(data, { clientId: parsed.data.clientId, endpoint: PENDING_ENDPOINT }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      reply.status(500).send(
        buildErrorEnvelope({
          clientId: parsed.data.clientId,
          endpoint: PENDING_ENDPOINT,
          code: "INTERNAL_ERROR",
          message,
          details: err instanceof ZodError ? err.flatten() : undefined,
        }),
      );
    }
  }

  private extractClientId(query: unknown): string {
    if (typeof query === "object" && query !== null && "clientId" in query) {
      const value = (query as { clientId?: unknown }).clientId;
      return typeof value === "string" ? value : "unknown";
    }
    return "unknown";
  }
}
