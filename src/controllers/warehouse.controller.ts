import type { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import {
  buildErrorEnvelope,
  buildSuccessEnvelope,
  pickingTasksQuerySchema,
  receivingTasksQuerySchema,
} from "../domain/types.js";
import type { PickingTasksUseCase } from "../usecases/picking-tasks.usecase.js";
import type { ReceivingTasksUseCase } from "../usecases/receiving-tasks.usecase.js";

const PICKING_ENDPOINT = "/warehouse/picking-tasks";
const RECEIVING_ENDPOINT = "/warehouse/receiving-tasks";

export class WarehouseController {
  public constructor(
    private readonly pickingTasksUseCase: PickingTasksUseCase,
    private readonly receivingTasksUseCase: ReceivingTasksUseCase,
  ) {}

  public async handlePicking(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const parsed = pickingTasksQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.status(400).send(
        buildErrorEnvelope({
          clientId: this.extractClientId(request.query),
          endpoint: PICKING_ENDPOINT,
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: parsed.error.flatten(),
        }),
      );
      return;
    }
    try {
      const data = await this.pickingTasksUseCase.execute(parsed.data);
      reply.send(buildSuccessEnvelope(data, { clientId: parsed.data.clientId, endpoint: PICKING_ENDPOINT }));
    } catch (err) {
      this.sendUnexpected(reply, parsed.data.clientId, PICKING_ENDPOINT, err);
    }
  }

  public async handleReceiving(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const parsed = receivingTasksQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.status(400).send(
        buildErrorEnvelope({
          clientId: this.extractClientId(request.query),
          endpoint: RECEIVING_ENDPOINT,
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: parsed.error.flatten(),
        }),
      );
      return;
    }
    try {
      const data = await this.receivingTasksUseCase.execute(parsed.data);
      reply.send(
        buildSuccessEnvelope(data, { clientId: parsed.data.clientId, endpoint: RECEIVING_ENDPOINT }),
      );
    } catch (err) {
      this.sendUnexpected(reply, parsed.data.clientId, RECEIVING_ENDPOINT, err);
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
