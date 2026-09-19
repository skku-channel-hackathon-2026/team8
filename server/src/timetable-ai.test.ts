import assert from "node:assert/strict";
import test from "node:test";
import type Anthropic from "@anthropic-ai/sdk";
import { handleTimetableRequest, normalizeClasses } from "./timetable-ai.js";
import { createWamSessionToken, readWamSessionToken } from "./wam-session.js";

const secret = "test-app-secret";
const image = { mediaType: "image/png", data: "A".repeat(200) };

function post(url: string, headers: Record<string, string> = {}) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(image),
  });
}

const unusedClient = (): Anthropic => {
  throw new Error("The model must not be called in this test");
};

test("normalizeClasses keeps valid weekday blocks and drops broken ones", () => {
  const result = normalizeClasses([
    {
      name: "  경영학원론 ",
      day: "수",
      start: "10:30",
      end: "11:45",
      room: "33101",
    },
    { name: "대학글쓰기", day: "월", start: "9:02", end: "10:14", room: "" },
    {
      name: "경영학원론",
      day: "수",
      start: "10:30",
      end: "11:45",
      room: "33101",
    },
    { name: "끝이 먼저", day: "화", start: "13:00", end: "12:00", room: "" },
    { name: "토요특강", day: "토", start: "10:00", end: "12:00", room: "" },
    { name: "", day: "목", start: "10:00", end: "11:00", room: "" },
  ]);

  assert.deepEqual(result.classes, [
    { name: "대학글쓰기", day: 0, start: 540, end: 615, room: "" },
    { name: "경영학원론", day: 2, start: 630, end: 705, room: "33101" },
  ]);
  assert.equal(result.skipped, 3);
});

test("WAM session tokens are bound to the app secret", () => {
  const session = {
    channelId: "c",
    managerId: "m",
    expiresAt: Date.now() + 1000,
  };
  const token = createWamSessionToken(session, secret);
  assert.deepEqual(readWamSessionToken(token, secret), session);
  assert.equal(readWamSessionToken(token, "other-secret"), undefined);
  assert.equal(readWamSessionToken(`${token}x`, secret), undefined);
});

test("hosted requests without a valid session token are rejected", async () => {
  const env = { APP_SECRET: secret, ANTHROPIC_API_KEY: "key" };
  const url = "https://team.example.workers.dev/api/timetable/parse";

  const missing = await handleTimetableRequest(post(url), env, unusedClient);
  assert.equal(missing.status, 401);

  const expired = createWamSessionToken(
    { channelId: "c", managerId: "m", expiresAt: Date.now() - 1 },
    secret,
  );
  const stale = await handleTimetableRequest(
    post(url, { "x-taggongsa-session": expired }),
    env,
    unusedClient,
  );
  assert.equal(stale.status, 401);
});

test("a missing API key is reported instead of calling the model", async () => {
  const response = await handleTimetableRequest(
    post("http://127.0.0.1:8787/api/timetable/parse"),
    { APP_SECRET: secret },
    unusedClient,
  );
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "ai_not_configured" });
});
