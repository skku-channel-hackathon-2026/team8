import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/**
 * 채널톡에서 연 WAM만 서버의 유료 기능(AI 시간표 인식)을 부를 수 있게 하는 서명 토큰.
 * `tutorial.open` Function이 발급해 wamArgs로 넘기고, WAM은 요청 헤더에 담아 보낸다.
 */
const WamSessionSchema = z.object({
  channelId: z.string().min(1),
  managerId: z.string(),
  expiresAt: z.number().int().positive(),
});

const signatureDomain = "taggongsa-wam-session\0";

export type WamSession = z.infer<typeof WamSessionSchema>;

export function createWamSessionToken(
  session: WamSession,
  secret: string,
): string {
  const body = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = createHmac("sha256", secret)
    .update(signatureDomain)
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

export function readWamSessionToken(
  token: string,
  secret: string,
): WamSession | undefined {
  const parts = token.split(".");
  if (parts.length !== 2) return undefined;

  const [body, signature] = parts;
  if (!body || !signature) return undefined;

  try {
    const expected = createHmac("sha256", secret)
      .update(signatureDomain)
      .update(body)
      .digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      return undefined;

    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    const result = WamSessionSchema.safeParse(parsed);
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}
