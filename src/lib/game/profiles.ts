import "server-only";
import { z } from "zod";
import { requireGuardianSession } from "@/lib/auth";
import { loadSaga } from "@/lib/levels/server";
import { getServiceSupabase } from "@/lib/supabase";
import { AVATAR_KEYS } from "./avatars";

export const childProfileInputSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  sidekickNames: z.array(z.string().trim().min(1).max(80)).max(12),
  avatarKey: z.enum(AVATAR_KEYS),
  sagaId: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});
export type ChildProfileInput = z.infer<typeof childProfileInputSchema>;

export interface ChildProfile extends ChildProfileInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

function mapProfile(row: Record<string, unknown>): ChildProfile {
  return {
    id: String(row.id), displayName: String(row.display_name),
    sidekickNames: row.sidekick_names as string[],
    avatarKey: row.avatar_key as ChildProfile["avatarKey"],
    sagaId: String(row.saga_id), createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

export async function listChildProfiles(): Promise<ChildProfile[]> {
  await requireGuardianSession();
  const { data, error } = await getServiceSupabase()
    .from("child_profiles").select("*").order("created_at");
  if (error) throw error;
  return (data ?? []).map(mapProfile);
}

export async function createChildProfile(input: ChildProfileInput): Promise<ChildProfile> {
  await requireGuardianSession();
  const value = childProfileInputSchema.parse(input);
  await loadSaga(value.sagaId);
  const { data, error } = await getServiceSupabase().from("child_profiles").insert({
    display_name: value.displayName, sidekick_names: value.sidekickNames,
    avatar_key: value.avatarKey, saga_id: value.sagaId,
  }).select("*").single();
  if (error) throw error;
  return mapProfile(data);
}

export async function updateChildProfile(
  id: string, input: ChildProfileInput,
): Promise<ChildProfile> {
  await requireGuardianSession();
  const value = childProfileInputSchema.parse(input);
  await loadSaga(value.sagaId);
  const { data, error } = await getServiceSupabase().from("child_profiles").update({
    display_name: value.displayName, sidekick_names: value.sidekickNames,
    avatar_key: value.avatarKey, saga_id: value.sagaId,
  }).eq("id", id).select("*").single();
  if (error) throw error;
  return mapProfile(data);
}
