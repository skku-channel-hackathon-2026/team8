import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z as zv4 } from "zod/v4";
import { z } from "zod";
import { readWamSessionToken } from "./wam-session.js";

/**
 * 타공사 WAM의 "시간표 이미지로 추가" 기능.
 * 시간표 캡처를 Claude에 보내 수업 칸을 그대로 옮겨 적게 하고, 서버에서 한 번 더 검증한다.
 * Cloudflare Worker의 `/api/timetable/parse` 경로에서 호출된다.
 */

const MODEL = "claude-opus-5";
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const SESSION_HEADER = "x-taggongsa-session";

const DAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;

const ExtractedClassSchema = zv4.object({
  name: zv4
    .string()
    .describe("수업 칸에 적힌 과목명. 이미지에 보이는 글자 그대로"),
  day: zv4.enum(DAYS).describe("수업 칸이 놓인 요일 열"),
  start: zv4.string().describe("시작 시각, 24시간제 HH:MM"),
  end: zv4.string().describe("끝 시각, 24시간제 HH:MM"),
  room: zv4
    .string()
    .describe("수업 칸에 적힌 강의실 글자 그대로. 없으면 빈 문자열"),
});

const ExtractionSchema = zv4.object({
  isTimetable: zv4
    .boolean()
    .describe("이미지가 수업 시간표이면 true, 아니면 false"),
  classes: zv4.array(ExtractedClassSchema),
});

export type ExtractedClass = zv4.infer<typeof ExtractedClassSchema>;

const SYSTEM_PROMPT = `You transcribe screenshots of Sungkyunkwan University (SKKU) student timetables into structured data. Screenshots usually come from Everytime (에브리타임), GLS, or Kingo-M.

Students rely on the result to know when they are free between classes, so a wrong time or an invented course is worse than leaving a class out.

For every class block in the image:
- name: the course title exactly as printed, in the original language and spacing. Do not translate it, expand abbreviations, or replace it with a course you think it should be. If the title is cut off, give only the visible part.
- room: the classroom text exactly as printed, such as "33101" or "경영관 33101". Use an empty string when no room is shown, and never add a building name that is not in the image.
- day: the weekday column the block sits in.
- start and end: 24-hour HH:MM. Use times written on the block or in a list when they exist. Otherwise read the block's top and bottom edges against the hour labels on the time axis. SKKU classes normally start on the hour or the half hour.

A course that meets on several days shows up as several blocks; output one entry per block. If the image is not a class timetable, set isTimetable to false and return an empty list.`;

const RequestSchema = z.object({
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  data: z
    .string()
    .min(100)
    .max(MAX_BODY_BYTES)
    .regex(/^[A-Za-z0-9+/=]+$/),
});

export interface NormalizedClass {
  name: string;
  day: number;
  start: number;
  end: number;
  room: string;
}

export interface NormalizedResult {
  classes: NormalizedClass[];
  skipped: number;
}

function toMinutes(value: string): number | null {
  const match = /^\s*(\d{1,2})\s*[:시]\s*(\d{2})/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function roundToFive(minutes: number): number {
  return Math.round(minutes / 5) * 5;
}

function clean(value: string, max: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

/**
 * 모델이 돌려준 수업 목록을 앱에서 쓸 수 있는 형태로 바꾼다.
 * 시간이 이상하거나 주말인 칸, 중복된 칸은 빼고 몇 개를 뺐는지 함께 돌려준다.
 */
export function normalizeClasses(raw: ExtractedClass[]): NormalizedResult {
  const classes: NormalizedClass[] = [];
  const seen = new Set<string>();
  let skipped = 0;

  for (const item of raw) {
    const name = clean(item.name, 60);
    const room = clean(item.room, 40);
    const day = DAYS.indexOf(item.day);
    const start = toMinutes(item.start);
    const end = toMinutes(item.end);

    if (
      !name ||
      day < 0 ||
      day > 4 ||
      start === null ||
      end === null ||
      end <= start ||
      end - start > 6 * 60 ||
      start < 6 * 60
    ) {
      skipped += 1;
      continue;
    }

    const block = {
      name,
      day,
      start: roundToFive(start),
      end: roundToFive(end),
      room,
    };
    const key = `${block.day}|${block.start}|${block.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    classes.push(block);
  }

  classes.sort((a, b) => a.day - b.day || a.start - b.start);
  return { classes, skipped };
}

export class TimetableAiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
  }
}

export async function extractTimetable(
  client: Anthropic,
  image: z.infer<typeof RequestSchema>,
): Promise<NormalizedResult> {
  let response;
  try {
    response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      output_config: { format: betaZodOutputFormat(ExtractionSchema) },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image.mediaType,
                data: image.data,
              },
            },
            {
              type: "text",
              text: "이 시간표에 있는 수업 칸을 모두 옮겨 적어 주세요.",
            },
          ],
        },
      ],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new TimetableAiError("ai_not_configured", 503);
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new TimetableAiError("busy", 429);
    }
    if (error instanceof Anthropic.BadRequestError) {
      throw new TimetableAiError("bad_image", 400);
    }
    throw new TimetableAiError("ai_failed", 502);
  }

  if (response.stop_reason === "refusal") {
    throw new TimetableAiError("refused", 422);
  }
  const parsed = response.parsed_output;
  if (!parsed) throw new TimetableAiError("ai_failed", 502);
  if (!parsed.isTimetable) throw new TimetableAiError("not_timetable", 422);

  const result = normalizeClasses(parsed.classes);
  if (result.classes.length === 0) {
    throw new TimetableAiError("no_classes", 422);
  }
  return result;
}

export interface TimetableEnv {
  ANTHROPIC_API_KEY?: string;
  APP_SECRET?: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function isLocal(url: URL): boolean {
  return url.hostname === "127.0.0.1" || url.hostname === "localhost";
}

export async function handleTimetableRequest(
  request: Request,
  env: TimetableEnv,
  makeClient: (apiKey: string) => Anthropic = (apiKey) =>
    new Anthropic({ apiKey, maxRetries: 1, timeout: 120_000 }),
): Promise<Response> {
  if (request.method !== "POST")
    return json({ error: "method_not_allowed" }, 405);

  // 로컬 개발 서버에서는 채널톡 없이도 시험할 수 있게 토큰 확인을 건너뛴다.
  if (!isLocal(new URL(request.url))) {
    const token = request.headers.get(SESSION_HEADER) ?? "";
    const session = env.APP_SECRET
      ? readWamSessionToken(token, env.APP_SECRET)
      : undefined;
    if (!session || session.expiresAt <= Date.now()) {
      return json({ error: "unauthorized" }, 401);
    }
  }

  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_BODY_BYTES) return json({ error: "too_large" }, 413);

  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return json({ error: "ai_not_configured" }, 503);

  let image: z.infer<typeof RequestSchema>;
  try {
    image = RequestSchema.parse(await request.json());
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  try {
    return json(await extractTimetable(makeClient(apiKey), image));
  } catch (error) {
    if (error instanceof TimetableAiError) {
      return json({ error: error.code }, error.status);
    }
    return json({ error: "ai_failed" }, 502);
  }
}
