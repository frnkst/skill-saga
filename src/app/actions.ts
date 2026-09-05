"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  guardianLogin,
  guardianLogout,
  selectActiveChild,
} from "@/lib/auth";
import {
  childProfileInputSchema,
  createChildProfile,
  submitTask,
  updateChildProfile,
  type TaskLocation,
} from "@/lib/game";

export type ActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  awardedPoints?: number;
};

const passwordSchema = z.string().min(1, "Enter the grown-up password.");

function zodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

export async function loginAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) return { status: "error", message: zodMessage(parsed.error) };
  const result = await guardianLogin(parsed.data);
  if (!result.ok) {
    const locked = result.lockedUntil
      ? ` Too many tries—try again after ${new Date(result.lockedUntil).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })}.`
      : "";
    return { status: "error", message: `That password didn’t open the grown-up gate.${locked}` };
  }
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await guardianLogout();
  redirect("/");
}

export async function chooseChildAction(formData: FormData): Promise<void> {
  const childId = z.string().min(1).parse(formData.get("childId"));
  await selectActiveChild(childId);
  redirect("/adventures");
}

export async function saveProfileAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = childProfileInputSchema.safeParse({
    displayName: formData.get("displayName"),
    avatarKey: formData.get("avatarKey"),
    sagaId: formData.get("sagaId"),
    sidekickNames: String(formData.get("sidekickNames") ?? "")
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean),
  });
  if (!parsed.success) return { status: "error", message: zodMessage(parsed.error) };

  const id = String(formData.get("id") ?? "");
  if (id) await updateChildProfile(id, parsed.data);
  else await createChildProfile(parsed.data);
  revalidatePath("/");
  revalidatePath("/grown-ups/profiles");
  return {
    status: "success",
    message: id ? "Hero details saved!" : "Your new hero is ready!",
  };
}

const locationSchema = z.object({
  levelId: z.string().min(1),
  questId: z.string().min(1),
  partId: z.string().min(1),
  taskId: z.string().min(1),
});

export async function submitTaskAction(
  location: TaskLocation,
  _state: ActionState,
  response: unknown,
): Promise<ActionState> {
  const parsedLocation = locationSchema.safeParse(location);
  if (!parsedLocation.success) {
    return { status: "error", message: "This quest moved. Return to the map and try again." };
  }
  try {
    const result = await submitTask(parsedLocation.data, response);
    if (!result.correct) {
      return { status: "error", message: "Not quite yet. Try once more—you’re getting closer!" };
    }
    revalidatePath("/adventures");
    revalidatePath("/adventures/play");
    revalidatePath("/treasure");
    return {
      status: "success",
      message: result.duplicate ? "Already solved—onward!" : "Brilliant work! The story continues…",
      awardedPoints: result.awardedPoints,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "error", message: "That answer needs a little adjustment. Try again." };
    }
    if (
      error instanceof Error &&
      ["Task is locked", "Task not found", "All released tasks are complete"].includes(error.message)
    ) {
      return { status: "error", message: "This quest has moved on. Return to your map." };
    }
    throw error;
  }
}
