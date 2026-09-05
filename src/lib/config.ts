import "server-only";
import { z } from "zod";

const schema = z.object({
  APP_URL: z.url(),
  APP_TIMEZONE: z.string().min(1).refine((value) => {
    try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; }
    catch { return false; }
  }, "must be an IANA time zone"),
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  GUARDIAN_PASSWORD: z.string().min(12),
  SESSION_SECRET: z.string().min(32),
  DEFAULT_HERO_NAME: z.string().trim().min(1).max(80),
  DEFAULT_SIDEKICK_NAMES: z.string().transform((value) =>
    value.split(",").map((name) => name.trim()).filter(Boolean)),
});

export type AppConfig = z.infer<typeof schema>;
let cached: AppConfig | undefined;

export function getConfig(): AppConfig {
  return cached ??= schema.parse(process.env);
}
