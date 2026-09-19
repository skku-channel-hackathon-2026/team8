import { createServer } from "node:http";
import { httpServerHandler } from "cloudflare:node";
import { env } from "cloudflare:workers";
import { withDatabase } from "../server/dist/src/database.js";
import handler from "../server/dist/src/serverless.js";
import { handleTimetableRequest } from "../server/dist/src/timetable-ai.js";
import { handleApiRequest } from "../server/dist/src/api.js";

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
      // `auth`도 같은 이유로 있다. APP_SECRET이 없으면 서명을 확인할 수 없어
      // 모든 /api/* 가 401이 된다. 밖에서 보면 토큰이 틀린 것과 구별되지
      // 않으므로, 설정 여부만(값은 절대 아니고) 알린다.
      const auth = Boolean(bindings.APP_SECRET?.trim());
      try {
        await bindings.DB.prepare("SELECT 1 AS ok").first();
        return Response.json({ ok: true, ai, auth });
      } catch {
        return Response.json({ ok: false, ai, auth }, { status: 503 });
      }
    }
    // 타공사 자체 API. D1을 쓰므로 withDatabase 안에서 실행한다.
    if (new URL(request.url).pathname.startsWith("/api/")) {
      const response = await withDatabase(bindings.DB, () =>
        handleApiRequest(request, bindings),
      );
      if (response) return response;
    }
    return http.fetch(request, bindings, context);
  },
};
