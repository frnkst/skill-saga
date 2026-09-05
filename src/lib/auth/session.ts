import { createHmac, timingSafeEqual } from "node:crypto";

export interface SignedSession {
  kind: "guardian" | "child";
  subject: string;
  expiresAt: number;
}

const encode = (value: string) => Buffer.from(value).toString("base64url");
const signature = (payload: string, secret: string) =>
  createHmac("sha256", secret).update(payload).digest("base64url");

export function signSession(session: SignedSession, secret: string): string {
  const payload = encode(JSON.stringify(session));
  return `${payload}.${signature(payload, secret)}`;
}

export function verifySession(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): SignedSession | null {
  if (!token) return null;
  const [payload, provided, extra] = token.split(".");
  if (!payload || !provided || extra) return null;
  const expected = signature(payload, secret);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString()) as SignedSession;
    if (
      !value || !["guardian", "child"].includes(value.kind) ||
      typeof value.subject !== "string" || !Number.isFinite(value.expiresAt) ||
      value.expiresAt <= now
    ) return null;
    return value;
  } catch {
    return null;
  }
}

export function constantTimeEqual(left: string, right: string): boolean {
  const a = createHmac("sha256", "guardian-password").update(left).digest();
  const b = createHmac("sha256", "guardian-password").update(right).digest();
  return timingSafeEqual(a, b);
}
