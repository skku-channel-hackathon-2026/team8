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
        // 잔액 더하기: 음수가 되면 아무것도 바꾸지 않는다.
        if (sql.includes("json_set(value_json")) {
          const delta = Number(args[0]);
          const id = String(args[1]);
          const stored = rows.get(id);
          if (!stored) return null;
          const doc = JSON.parse(stored) as { leaves: number };
          const next = doc.leaves + delta;
          if (next < 0) return null;
          rows.set(id, JSON.stringify({ ...doc, leaves: next }));
          return { leaves: next } as T;
        }
        // 조건부 교체: status가 기대값일 때만 바꾼다.
        if (sql.includes("SET value_json = ?1")) {
          const value = String(args[0]);
          const id = String(args[1]);
          const expected = String(args[2]);
          const stored = rows.get(id);
          if (!stored) return null;
          if ((JSON.parse(stored) as { status: string }).status !== expected) {
            return null;
          }
          rows.set(id, value);
          return { id } as T;
        }
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

// ---------------------------------------------------------------------------
// 공강 마켓 — 상태 전이와 보수 이동은 서버가 판정한다
// ---------------------------------------------------------------------------

const draft = {
  title: "택배 찾아주기",
  detail: "",
  place: "학관",
  deadline: 9_999_999_999_999,
  duration: 30,
  reward: 30,
  category: "errand",
};

function tokenFor(managerId: string): string {
  return createWamSessionToken(
    { channelId: "ch1", managerId, expiresAt: Date.now() + 3600_000 },
    secret,
  );
}

function asUser(token: string, path: string, body?: unknown) {
  return new Request(`${HOSTED}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "content-type": "application/json",
      "x-taggongsa-session": token,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function user(managerId: string, leaves: number) {
  return {
    id: `ch1:${managerId}`,
    channelId: "ch1",
    managerId,
    nickname: managerId,
    department: "경영학과",
    campus: "humanities",
    role: "fresh",
    showFree: true,
    tone: 0,
    leaves,
    timetable: [],
    createdAt: 1,
  };
}

test("posting a task escrows the reward and refuses an empty balance", async () => {
  const database = fakeDatabase({
    "user:ch1:alice": user("alice", 100),
    "user:ch1:broke": user("broke", 0),
  });
  const env = { APP_SECRET: secret };

  const poor = await withDatabase(database, () =>
    handleApiRequest(
      asUser(tokenFor("broke"), "/api/tasks/create", draft),
      env,
    ),
  );
  assert.equal(poor?.status, 409);
  assert.deepEqual(await poor?.json(), { error: "insufficient_leaves" });

  const created = await withDatabase(database, () =>
    handleApiRequest(
      asUser(tokenFor("alice"), "/api/tasks/create", draft),
      env,
    ),
  );
  assert.equal(created?.status, 201);
  const body = (await created?.json()) as { leaves: number };
  assert.equal(body.leaves, 70);
});

test("only one of two people racing for the same task gets it", async () => {
  const database = fakeDatabase({
    "user:ch1:alice": user("alice", 100),
    "user:ch1:bob": user("bob", 0),
    "user:ch1:carol": user("carol", 0),
  });
  const env = { APP_SECRET: secret };

  const created = await withDatabase(database, () =>
    handleApiRequest(
      asUser(tokenFor("alice"), "/api/tasks/create", draft),
      env,
    ),
  );
  const { task } = (await created?.json()) as { task: { id: string } };

  const take = (who: string) =>
    withDatabase(database, () =>
      handleApiRequest(
        asUser(tokenFor(who), "/api/tasks/take", { taskId: task.id }),
        env,
      ),
    );
  const [bob, carol] = await Promise.all([take("bob"), take("carol")]);

  assert.deepEqual([bob?.status, carol?.status].sort(), [200, 409]);
  const loser = bob?.status === 409 ? bob : carol;
  assert.deepEqual(await loser?.json(), { error: "task_changed" });
});

test("the requester cannot take their own task", async () => {
  const database = fakeDatabase({ "user:ch1:alice": user("alice", 100) });
  const env = { APP_SECRET: secret };
  const created = await withDatabase(database, () =>
    handleApiRequest(
      asUser(tokenFor("alice"), "/api/tasks/create", draft),
      env,
    ),
  );
  const { task } = (await created?.json()) as { task: { id: string } };

  const response = await withDatabase(database, () =>
    handleApiRequest(
      asUser(tokenFor("alice"), "/api/tasks/take", { taskId: task.id }),
      env,
    ),
  );
  assert.equal(response?.status, 403);
});

test("the reward reaches the worker once, and only when the requester says so", async () => {
  const database = fakeDatabase({
    "user:ch1:alice": user("alice", 100),
    "user:ch1:bob": user("bob", 0),
  });
  const env = { APP_SECRET: secret };
  const call = (who: string, path: string, body?: unknown) =>
    withDatabase(database, () =>
      handleApiRequest(asUser(tokenFor(who), path, body), env),
    );

  const created = await call("alice", "/api/tasks/create", draft);
  const { task } = (await created?.json()) as { task: { id: string } };
  await call("bob", "/api/tasks/take", { taskId: task.id });

  // 작업자만 완료를 보고할 수 있다.
  assert.equal(
    (await call("alice", "/api/tasks/report", { taskId: task.id }))?.status,
    403,
  );
  assert.equal(
    (await call("bob", "/api/tasks/report", { taskId: task.id }))?.status,
    200,
  );

  // 확정은 요청자만 한다.
  assert.equal(
    (await call("bob", "/api/tasks/confirm", { taskId: task.id }))?.status,
    403,
  );
  assert.equal(
    (await call("alice", "/api/tasks/confirm", { taskId: task.id }))?.status,
    200,
  );

  const me = await call("bob", "/api/me");
  const { profile } = (await me?.json()) as { profile: { leaves: number } };
  assert.equal(profile.leaves, 30);

  // 두 번 확정해도 보수는 한 번만 나간다.
  assert.equal(
    (await call("alice", "/api/tasks/confirm", { taskId: task.id }))?.status,
    409,
  );
  const again = await call("bob", "/api/me");
  const { profile: after } = (await again?.json()) as {
    profile: { leaves: number };
  };
  assert.equal(after.leaves, 30);
});

test("cancelling an open task refunds the escrow", async () => {
  const database = fakeDatabase({ "user:ch1:alice": user("alice", 100) });
  const env = { APP_SECRET: secret };
  const call = (who: string, path: string, body?: unknown) =>
    withDatabase(database, () =>
      handleApiRequest(asUser(tokenFor(who), path, body), env),
    );

  const created = await call("alice", "/api/tasks/create", draft);
  const { task } = (await created?.json()) as { task: { id: string } };

  const cancelled = await call("alice", "/api/tasks/cancel", {
    taskId: task.id,
  });
  assert.equal(cancelled?.status, 200);
  const body = (await cancelled?.json()) as { leaves: number };
  assert.equal(body.leaves, 100);
});
