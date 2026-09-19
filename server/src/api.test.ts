import assert from "node:assert/strict";
import test from "node:test";
import { handleApiRequest } from "./api.js";
import {
  withDatabase,
  type AppDatabase,
  type PreparedStatement,
} from "./database.js";
import { createWamSessionToken } from "./wam-session.js";

const secret = "test-app-secret";
const LOCAL = "http://127.0.0.1:8787";
const HOSTED = "https://team.example.workers.dev";

/** app_records만 흉내 내는 최소 test double. 실제 SQL은 D1이 실행한다. */
function fakeDatabase(seed: Record<string, unknown> = {}): AppDatabase {
  const rows = new Map<string, string>();
  for (const [id, value] of Object.entries(seed)) {
    rows.set(id, JSON.stringify(value));
  }

  function statement(
    sql: string,
    args: (string | number | null)[],
  ): PreparedStatement {
    const self: PreparedStatement = {
      bind: (...values) => statement(sql, values),
      run: async () => {
        if (sql.includes("INSERT INTO app_records")) {
          rows.set(String(args[0]), String(args[1]));
        } else if (sql.includes("DELETE FROM app_records")) {
          rows.delete(String(args[0]));
        }
        return undefined;
      },
      first: async <T>() => {
        const value = rows.get(String(args[0]));
        return value ? ({ value_json: value } as T) : null;
      },
      all: async <T>() => {
        const prefix = String(args[0]).replace(/%$/, "");
        const results = [...rows.entries()]
          .filter(([id]) => id.startsWith(prefix))
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([, value_json]) => ({ value_json }) as T);
        return { results };
      },
    };
    return self;
  }

  return { prepare: (sql) => statement(sql, []), batch: async () => [] };
}

function post(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const signup = {
  nickname: "백엔드",
  department: "소프트웨어학과",
  campus: "natural",
  role: "senior",
};

test("hosted requests without a valid session token are rejected", async () => {
  const response = await withDatabase(fakeDatabase(), () =>
    handleApiRequest(post(`${HOSTED}/api/me/signup`, signup), {
      APP_SECRET: secret,
    }),
  );
  assert.equal(response?.status, 401);

  const expired = createWamSessionToken(
    { channelId: "c", managerId: "m", expiresAt: Date.now() - 1 },
    secret,
  );
  const stale = await withDatabase(fakeDatabase(), () =>
    handleApiRequest(
      post(`${HOSTED}/api/me/signup`, signup, {
        "x-taggongsa-session": expired,
      }),
      { APP_SECRET: secret },
    ),
  );
  assert.equal(stale?.status, 401);
});

test("the profile id comes from the session, not the request body", async () => {
  const database = fakeDatabase();
  const response = await withDatabase(database, () =>
    handleApiRequest(
      post(`${LOCAL}/api/me/signup`, { ...signup, id: "someone-else" }),
      {},
    ),
  );
  assert.equal(response?.status, 201);
  const body = (await response?.json()) as { profile: Record<string, unknown> };
  assert.equal(body.profile.id, "local-preview:local-preview-manager");
  assert.equal(body.profile.managerId, "local-preview-manager");
  assert.equal(body.profile.leaves, 0);
});

test("signing up twice is refused", async () => {
  const database = fakeDatabase();
  const first = await withDatabase(database, () =>
    handleApiRequest(post(`${LOCAL}/api/me/signup`, signup), {}),
  );
  assert.equal(first?.status, 201);

  const second = await withDatabase(database, () =>
    handleApiRequest(post(`${LOCAL}/api/me/signup`, signup), {}),
  );
  assert.equal(second?.status, 409);
});

test("a timetable with an impossible block is refused", async () => {
  const database = fakeDatabase();
  await withDatabase(database, () =>
    handleApiRequest(post(`${LOCAL}/api/me/signup`, signup), {}),
  );

  const bad = new Request(`${LOCAL}/api/me/timetable`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      blocks: [{ id: "x", name: "", day: 9, start: 0, end: 0, place: "" }],
    }),
  });
  const response = await withDatabase(database, () =>
    handleApiRequest(bad, {}),
  );
  assert.equal(response?.status, 400);
});

test("the student list hides other channels, hidden students and yourself", async () => {
  const peer = (channelId: string, managerId: string, showFree: boolean) => ({
    id: `${channelId}:${managerId}`,
    channelId,
    managerId,
    nickname: managerId,
    department: "학과",
    campus: "natural",
    role: "fresh",
    showFree,
    tone: 0,
    leaves: 99,
    timetable: [],
    createdAt: 1,
  });

  const database = fakeDatabase({
    "user:local-preview:visible": peer("local-preview", "visible", true),
    "user:local-preview:hidden": peer("local-preview", "hidden", false),
    "user:other-channel:elsewhere": peer("other-channel", "elsewhere", true),
  });
  await withDatabase(database, () =>
    handleApiRequest(post(`${LOCAL}/api/me/signup`, signup), {}),
  );

  const response = await withDatabase(database, () =>
    handleApiRequest(new Request(`${LOCAL}/api/students`), {}),
  );
  const body = (await response?.json()) as { students: { id: string }[] };
  assert.deepEqual(
    body.students.map((s) => s.id),
    ["local-preview:visible"],
  );

  // 신원과 잔액은 남에게 나가지 않는다.
  const serialized = JSON.stringify(body);
  assert.ok(!serialized.includes("managerId"));
  assert.ok(!serialized.includes("leaves"));
});

test("paths this module does not own fall through to the app", async () => {
  const response = await withDatabase(fakeDatabase(), () =>
    handleApiRequest(new Request(`${HOSTED}/api/health`), {
      APP_SECRET: secret,
    }),
  );
  // undefined면 Worker가 Nest 앱으로 넘긴다. 401이나 404를 돌려주면 기존 경로가 깨진다.
  assert.equal(response, undefined);
});

test("a known path with the wrong method is refused before auth", async () => {
  const response = await withDatabase(fakeDatabase(), () =>
    handleApiRequest(
      new Request(`${LOCAL}/api/students`, { method: "POST" }),
      {},
    ),
  );
  assert.equal(response?.status, 405);
});
