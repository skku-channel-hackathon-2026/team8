import { createServer } from "node:http";
import { httpServerHandler } from "cloudflare:node";
import { env } from "cloudflare:workers";
import { withDatabase } from "../server/dist/src/database.js";
import handler from "../server/dist/src/serverless.js";
import { handleTimetableRequest } from "../server/dist/src/timetable-ai.js";

const server = createServer((request, response) => {
  void withDatabase(env.DB, () => handler(request, response)).catch((error) => {
    console.error(
      "Request failed",
      error instanceof Error ? error.message : "unknown",
    );
    if (!response.headersSent) response.writeHead(500);
    response.end();
  });
});
const http = httpServerHandler(server);
export default {
  async fetch(request, bindings, context) {
    if (new URL(request.url).pathname === "/api/timetable/parse") {
      return handleTimetableRequest(request, bindings);
    }
    if (
      new URL(request.url).pathname === "/api/ready" &&
      request.method === "GET"
    ) {
      // `ai`는 ANTHROPIC_API_KEY가 설정됐는지만 알린다. 키 자체는 절대 내보내지 않는다.
      // 시간표 AI는 세션 토큰이 있어야 부를 수 있어서, 이 값이 없으면 키 누락과
      // 다른 실패를 밖에서 구분할 방법이 없다.
      const ai = Boolean(bindings.ANTHROPIC_API_KEY?.trim());
      try {
        await bindings.DB.prepare("SELECT 1 AS ok").first();
        return Response.json({ ok: true, ai });
      } catch {
        return Response.json({ ok: false, ai }, { status: 503 });
      }
    }
    return http.fetch(request, bindings, context);
  },
};
