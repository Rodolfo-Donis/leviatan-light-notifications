import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import {
  buildErrorEnvelope,
  buildSuccessEnvelope,
  supplierOnboardingQuerySchema,
  supplierRiskQuerySchema,
} from "../domain/types.js";
import type { SupplierOnboardingUseCase } from "../usecases/supplier-onboarding.usecase.js";
import type { SupplierRiskUseCase } from "../usecases/supplier-risk.usecase.js";

const ONBOARDING_ENDPOINT = "/suppliers/onboarding";
const RISK_ENDPOINT = "/suppliers/risk-assessment";

export class SupplierController {
  public constructor(
    private readonly onboardingUseCase: SupplierOnboardingUseCase,
    private readonly riskUseCase: SupplierRiskUseCase,
  ) {}

  public async handleOnboarding(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const parsed = supplierOnboardingQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      const clientId = this.extractClientId(request.query);
      reply.status(400).send(
        buildErrorEnvelope({
          clientId,
          endpoint: ONBOARDING_ENDPOINT,
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: parsed.error.flatten(),
        }),
      );
      return;
    }
    try {
      const data = await this.onboardingUseCase.execute(parsed.data);
      reply.send(
        buildSuccessEnvelope(data, { clientId: parsed.data.clientId, endpoint: ONBOARDING_ENDPOINT }),
      );
    } catch (err) {
      this.sendUnexpected(reply, parsed.data.clientId, ONBOARDING_ENDPOINT, err);
    }
  }

  public async handleRisk(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const parsed = supplierRiskQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      const clientId = this.extractClientId(request.query);
      reply.status(400).send(
        buildErrorEnvelope({
          clientId,
          endpoint: RISK_ENDPOINT,
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: parsed.error.flatten(),
        }),
      );
      return;
    }
    try {
      const data = await this.riskUseCase.execute(parsed.data);
      reply.send(buildSuccessEnvelope(data, { clientId: parsed.data.clientId, endpoint: RISK_ENDPOINT }));
    } catch (err) {
      this.sendUnexpected(reply, parsed.data.clientId, RISK_ENDPOINT, err);
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
