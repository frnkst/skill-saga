import "server-only";
import { createHmac } from "node:crypto";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { getConfig } from "@/lib/config";
import { getServiceSupabase } from "@/lib/supabase";
import { constantTimeEqual, signSession, verifySession } from "./session";

export const GUARDIAN_COOKIE = "skill-saga-guardian";
export const CHILD_COOKIE = "skill-saga-child";
const GUARDIAN_TTL = 8 * 60 * 60 * 1000;
const CHILD_TTL = 30 * 24 * 60 * 60 * 1000;

const options = (expires: Date) => ({
  httpOnly: true, secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const, path: "/", expires,
});

export async function getGuardianSession() {
  const store = await cookies();
  const session = verifySession(store.get(GUARDIAN_COOKIE)?.value, getConfig().SESSION_SECRET);
  return session?.kind === "guardian" ? session : null;
}

export async function requireGuardianSession() {
  const session = await getGuardianSession();
  if (!session) throw new Error("Guardian authentication required");
  return session;
}

export async function getActiveChildId(): Promise<string | null> {
  if (!(await getGuardianSession())) return null;
  const store = await cookies();
  const session = verifySession(store.get(CHILD_COOKIE)?.value, getConfig().SESSION_SECRET);
  return session?.kind === "child" ? session.subject : null;
}

export async function requireActiveChildId(): Promise<string> {
  const id = await getActiveChildId();
  if (!id) throw new Error("No active child selected");
  return id;
}

export async function guardianLogin(password: string): Promise<{ ok: boolean; lockedUntil?: string }> {
  const config = getConfig();
  const passwordMatches = constantTimeEqual(password, config.GUARDIAN_PASSWORD);
  const requestHeaders = await headers();
  const clientAddress =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "unknown-client";
  const attemptKey = createHmac("sha256", config.SESSION_SECRET)
    .update(clientAddress)
    .digest("hex");
  const { data, error } = await getServiceSupabase().rpc("record_guardian_login", {
    p_attempt_key: attemptKey,
    p_success: passwordMatches,
  });
  if (error) throw error;
  const result = Array.isArray(data) ? data[0] : data;
  if (!passwordMatches || !result?.allowed) {
    return {
      ok: false,
      ...(result?.locked_until && { lockedUntil: result.locked_until }),
    };
  }
  const expires = new Date(Date.now() + GUARDIAN_TTL);
  const store = await cookies();
  store.set(GUARDIAN_COOKIE, signSession({
    kind: "guardian", subject: "household", expiresAt: expires.getTime(),
  }, config.SESSION_SECRET), options(expires));
  return { ok: true };
}

export async function guardianLogout(): Promise<void> {
  const store = await cookies();
  store.delete(GUARDIAN_COOKIE);
  store.delete(CHILD_COOKIE);
}

export async function selectActiveChild(childId: string): Promise<void> {
  await requireGuardianSession();
  const { data, error } = await getServiceSupabase()
    .from("child_profiles").select("id").eq("id", childId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Child profile not found");
  const expires = new Date(Date.now() + CHILD_TTL);
  const store = await cookies();
  store.set(CHILD_COOKIE, signSession({
    kind: "child", subject: childId, expiresAt: expires.getTime(),
  }, getConfig().SESSION_SECRET), options(expires));
}
