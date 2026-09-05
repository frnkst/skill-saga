import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getConfig } from "@/lib/config";
import type { Database } from "./database";

let client: ReturnType<typeof createClient<Database>> | undefined;

export function getServiceSupabase() {
  if (!client) {
    const config = getConfig();
    client = createClient<Database>(
      config.NEXT_PUBLIC_SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return client;
}
