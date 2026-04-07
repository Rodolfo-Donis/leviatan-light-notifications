import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { buildErrorEnvelope, buildSuccessEnvelope, expiringContractsQuerySchema } from "../domain/types.js";
import type { ContractsExpiringUseCase } from "../usecases/contracts-expiring.usecase.js";

const EXPIRING_ENDPOINT = "/contracts/expiring";

export class ContractController {
  public constructor(private readonly contractsExpiringUseCase: ContractsExpiringUseCase) {}

  public async handleExpiring(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const parsed = expiringContractsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.status(400).send(
        buildErrorEnvelope({
          clientId: this.extractClientId(request.query),
          endpoint: EXPIRING_ENDPOINT,
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: parsed.error.flatten(),
        }),
      );
      return;
    }
    try {
      const data = await this.contractsExpiringUseCase.execute(parsed.data);
      reply.send(
        buildSuccessEnvelope(data, { clientId: parsed.data.clientId, endpoint: EXPIRING_ENDPOINT }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      reply.status(500).send(
        buildErrorEnvelope({
          clientId: parsed.data.clientId,
          endpoint: EXPIRING_ENDPOINT,
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
