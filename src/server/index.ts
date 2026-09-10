import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { hostname } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ActionResponse,
  LogsResponse,
  OverviewResponse,
  ScheduleAction,
} from "../shared/types.js";
import { adapters, findAdapter } from "./adapters/index.js";
import { detectPlatform } from "./platform.js";

const app = Fastify({ logger: true, bodyLimit: 16 * 1024 });
const port = Number(process.env.MUSTER_PORT ?? 4318);
const host = "127.0.0.1";
const allowedOrigins = new Set([
  "http://127.0.0.1:4317",
  "http://localhost:4317",
  `http://127.0.0.1:${port}`,
  `http://localhost:${port}`,
]);

app.addHook("onRequest", async (request, reply) => {
  if (!request.url.startsWith("/api/") || request.method === "GET") return;
  const origin = request.headers.origin;
  if (origin && !allowedOrigins.has(origin)) {
    return reply.code(403).send({ message: "허용되지 않은 요청 출처입니다." });
  }
  if (request.headers["content-type"] !== "application/json") {
    return reply.code(415).send({ message: "JSON 요청만 허용됩니다." });
  }
});

app.get("/api/overview", async (): Promise<OverviewResponse> => {
  const snapshots = await Promise.all(adapters.map((adapter) => adapter.collect()));
  return {
    generatedAt: new Date().toISOString(),
    hostname: hostname(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    platform: detectPlatform(),
    sources: snapshots.map((snapshot) => snapshot.source),
    schedules: snapshots.flatMap((snapshot) => snapshot.schedules),
  };
});

app.get<{ Params: { id: string } }>(
  "/api/schedules/:id/logs",
  async (request, reply): Promise<LogsResponse> => {
    const adapter = findAdapter(request.params.id);
    if (!adapter) return reply.code(404).send({ available: false, lines: [], message: "소스를 찾지 못했습니다." });
    return adapter.logs(request.params.id);
  },
);

app.post<{
  Params: { id: string };
  Body: { action?: ScheduleAction };
}>("/api/schedules/:id/actions", async (request, reply): Promise<ActionResponse> => {
  const { action } = request.body;
  if (!action || !["enable", "disable", "run"].includes(action)) {
    return reply.code(400).send({ ok: false, message: "올바르지 않은 작업입니다." });
  }
  const adapter = findAdapter(request.params.id);
  if (!adapter) return reply.code(404).send({ ok: false, message: "소스를 찾지 못했습니다." });
  const message = await adapter.action(request.params.id, action);
  return { ok: true, message };
});

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);
  const message = error instanceof Error ? error.message : "요청을 처리하지 못했습니다.";
  return reply.code(400).send({ ok: false, message });
});

if (process.env.NODE_ENV === "production") {
  const currentDirectory = dirname(fileURLToPath(import.meta.url));
  const clientRoot = join(currentDirectory, "..", "..", "dist", "client");
  await app.register(fastifyStatic, { root: clientRoot, wildcard: false });
  app.get("/*", (_request, reply) => reply.sendFile("index.html"));
}

await app.listen({ host, port });
