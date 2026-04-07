import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import {
  buildErrorEnvelope,
  buildSuccessEnvelope,
  poApprovalsQuerySchema,
  purchaseOrdersActiveQuerySchema,
} from "../domain/types.js";
import type { POApprovalsUseCase } from "../usecases/po-approvals.usecase.js";
import type { PurchaseOrdersUseCase } from "../usecases/purchase-orders.usecase.js";

const ACTIVE_ENDPOINT = "/purchase-orders/active";
const APPROVALS_ENDPOINT = "/purchase-orders/approvals";

export class POController {
  public constructor(
    private readonly purchaseOrdersUseCase: PurchaseOrdersUseCase,
    private readonly poApprovalsUseCase: POApprovalsUseCase,
  ) {}

  public async handleActive(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const parsed = purchaseOrdersActiveQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.status(400).send(
        buildErrorEnvelope({
          clientId: this.extractClientId(request.query),
          endpoint: ACTIVE_ENDPOINT,
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: parsed.error.flatten(),
        }),
      );
      return;
    }
    try {
      const data = await this.purchaseOrdersUseCase.execute(parsed.data);
      reply.send(buildSuccessEnvelope(data, { clientId: parsed.data.clientId, endpoint: ACTIVE_ENDPOINT }));
    } catch (err) {
      this.sendUnexpected(reply, parsed.data.clientId, ACTIVE_ENDPOINT, err);
    }
  }

  public async handleApprovals(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const parsed = poApprovalsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.status(400).send(
        buildErrorEnvelope({
          clientId: this.extractClientId(request.query),
          endpoint: APPROVALS_ENDPOINT,
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: parsed.error.flatten(),
        }),
      );
      return;
    }
    try {
      const data = await this.poApprovalsUseCase.execute(parsed.data);
      reply.send(
        buildSuccessEnvelope(data, { clientId: parsed.data.clientId, endpoint: APPROVALS_ENDPOINT }),
      );
    } catch (err) {
      this.sendUnexpected(reply, parsed.data.clientId, APPROVALS_ENDPOINT, err);
    }
  }

  private extractClientId(query: unknown): string {
    if (typeof query === "object" && query !== null && "clientId" in query) {
      const value = (query as { clientId?: unknown }).clientId;
      return typeof value === "string" ? value : "unknown";
    }
    return "unknown";
  }

  private sendUnexpected(reply: FastifyReply, clientId: string, endpoint: string, err: unknown): void {
    const message = err instanceof Error ? err.message : "Unexpected error";
    reply.status(500).send(
      buildErrorEnvelope({
        clientId,
        endpoint,
        code: "INTERNAL_ERROR",
        message,
        details: err instanceof ZodError ? err.flatten() : undefined,
      }),
    );
  }
}
