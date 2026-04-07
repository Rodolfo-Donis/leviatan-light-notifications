import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import {
  buildErrorEnvelope,
  buildSuccessEnvelope,
  criticalDeliveriesQuerySchema,
  deliveryTrackingQuerySchema,
} from "../domain/types.js";
import type { CriticalDeliveriesUseCase } from "../usecases/critical-deliveries.usecase.js";
import type { DeliveryTrackingUseCase } from "../usecases/delivery-tracking.usecase.js";

const CRITICAL_ENDPOINT = "/deliveries/critical";
const TRACKING_ENDPOINT = "/deliveries/tracking";

export class DeliveryController {
  public constructor(
    private readonly criticalDeliveriesUseCase: CriticalDeliveriesUseCase,
    private readonly deliveryTrackingUseCase: DeliveryTrackingUseCase,
  ) {}

  public async handleCritical(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const parsed = criticalDeliveriesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.status(400).send(
        buildErrorEnvelope({
          clientId: this.extractClientId(request.query),
          endpoint: CRITICAL_ENDPOINT,
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: parsed.error.flatten(),
        }),
      );
      return;
    }
    try {
      const data = await this.criticalDeliveriesUseCase.execute(parsed.data);
      reply.send(
        buildSuccessEnvelope(data, { clientId: parsed.data.clientId, endpoint: CRITICAL_ENDPOINT }),
      );
    } catch (err) {
      this.sendUnexpected(reply, parsed.data.clientId, CRITICAL_ENDPOINT, err);
    }
  }

  public async handleTracking(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const parsed = deliveryTrackingQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.status(400).send(
        buildErrorEnvelope({
          clientId: this.extractClientId(request.query),
          endpoint: TRACKING_ENDPOINT,
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: parsed.error.flatten(),
        }),
      );
      return;
    }
    try {
      const data = await this.deliveryTrackingUseCase.execute(parsed.data);
      reply.send(
        buildSuccessEnvelope(data, { clientId: parsed.data.clientId, endpoint: TRACKING_ENDPOINT }),
      );
    } catch (err) {
      this.sendUnexpected(reply, parsed.data.clientId, TRACKING_ENDPOINT, err);
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
