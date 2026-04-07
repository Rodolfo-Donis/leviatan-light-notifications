import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import type { Env } from "./env.js";

export async function createServer(env: Env): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
  });
  await app.register(cors, { origin: true });
  return app;
}
