import "server-only";
import { z } from "zod";
import { requireActiveChildId } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { toClientSafeLevel } from "@/lib/levels/client-safe";
import { evaluateTask } from "@/lib/levels/evaluate";
import { loadSaga } from "@/lib/levels/server";
import type { Level } from "@/lib/levels/schemas";
import { getServiceSupabase } from "@/lib/supabase";
import type { Json } from "@/lib/supabase/database";
import {
  calculateTotals, deriveAchievementKeys, findTask, localDate,
  releasedLevels, resolveResume, type TaskCompletion,
} from "./progression";

const idsSchema = z.object({
  levelId: z.string().min(1), questId: z.string().min(1),
  partId: z.string().min(1), taskId: z.string().min(1),
});
export type TaskLocation = z.infer<typeof idsSchema>;

async function activeContext() {
  const childId = await requireActiveChildId();
  const { data: child, error } = await getServiceSupabase()
    .from("child_profiles").select("*").eq("id", childId).single();
  if (error) throw error;
  const saga = await loadSaga(child.saga_id);
  return { childId, child, saga };
}

async function progressRows(childId: string, sagaId: string): Promise<TaskCompletion[]> {
  const { data, error } = await getServiceSupabase().from("part_progress")
    .select("level_id,quest_id,part_id,task_id,correct,points,variable_key,variable_value")
    .eq("child_id", childId).eq("saga_id", sagaId);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    levelId: row.level_id, questId: row.quest_id, partId: row.part_id,
    taskId: row.task_id, correct: row.correct, points: row.points,
    variableKey: row.variable_key, variableValue: row.variable_value,
  }));
}

export async function getActiveChildDashboard(now = new Date()) {
  const { childId, child, saga } = await activeContext();
  const levels = releasedLevels(saga.levels, localDate(now, getConfig().APP_TIMEZONE));
  const rows = await progressRows(childId, saga.manifest.id);
  const { data: earned, error: achievementError } = await getServiceSupabase()
    .from("achievements").select("achievement_key,earned_at")
    .eq("child_id", childId).eq("saga_id", saga.manifest.id).order("earned_at");
  if (achievementError) throw achievementError;
  const resume = resolveResume(levels, rows);
  const completed = new Set(rows.filter((row) => row.correct).map((row) => row.levelId));
  const levelCards = levels.map((level, index) => {
    const levelDone = level.quests.every((quest) => quest.parts.every((part) =>
      part.tasks.every((task) => rows.some((row) => row.correct &&
        row.levelId === level.id && row.questId === quest.id &&
        row.partId === part.id && row.taskId === task.id))));
    const unlocked = index === 0 || completed.has(levels[index - 1].id) &&
      levels[index - 1].quests.every((quest) => quest.parts.every((part) =>
        part.tasks.every((task) => rows.some((row) => row.correct &&
          row.levelId === levels[index - 1].id && row.taskId === task.id))));
    return { id: level.id, levelNumber: level.levelNumber, title: level.title,
      date: level.date, status: levelDone ? "completed" : unlocked ? "unlocked" : "locked" };
  });
  return {
    child: {
      id: child.id, displayName: child.display_name, sidekickNames: child.sidekick_names,
      avatarKey: child.avatar_key, sagaId: child.saga_id,
    },
    saga: {
      ...saga.manifest,
      levels: saga.manifest.levels.filter((reference) =>
        levels.some((level) => level.id === reference.id)),
    },
    levels: levelCards, resume,
    currentLevel: resume
      ? toClientSafeLevel(levels.find((level) => level.id === resume.levelId)!)
      : null,
    achievements: earned ?? [],
    totals: calculateTotals(levels, rows),
    variables: Object.fromEntries(rows.filter((row) => row.correct && row.variableKey)
      .map((row) => [row.variableKey!, row.variableValue ?? ""])),
  };
}

async function synchronizeProgress(
  childId: string, sagaId: string, levels: Level[],
  rows: TaskCompletion[],
) {
  const resume = resolveResume(levels, rows);
  const completedLevelIds = levels.filter((level) => level.quests.every((quest) =>
    quest.parts.every((part) => part.tasks.every((task) => rows.some((row) =>
      row.correct && row.levelId === level.id && row.questId === quest.id &&
      row.partId === part.id && row.taskId === task.id))))).map((level) => level.id);
  for (const level of levels) {
    if (completedLevelIds.includes(level.id) || resume?.levelId === level.id) {
      const completed = completedLevelIds.includes(level.id);
      const { error } = await getServiceSupabase().from("level_progress").upsert({
        child_id: childId, saga_id: sagaId, level_id: level.id,
        level_number: level.levelNumber, status: completed ? "completed" : "in_progress",
        current_quest_id: completed ? null : resume?.questId,
        current_part_id: completed ? null : resume?.partId,
        current_task_id: completed ? null : resume?.taskId,
        completed_at: completed ? new Date().toISOString() : null,
      }, { onConflict: "child_id,saga_id,level_id" });
      if (error) throw error;
    }
  }
  const achievements = deriveAchievementKeys(levels, rows);
  if (achievements.length) {
    const { error } = await getServiceSupabase().from("achievements").upsert(
      achievements.map((achievement_key) => ({ child_id: childId, saga_id: sagaId, achievement_key })),
      { onConflict: "child_id,saga_id,achievement_key", ignoreDuplicates: true },
    );
    if (error) throw error;
  }
  return { resume, achievements };
}

export async function submitTask(
  locationInput: TaskLocation, response: unknown, now = new Date(),
) {
  const location = idsSchema.parse(locationInput);
  const { childId, saga } = await activeContext();
  const levels = releasedLevels(saga.levels, localDate(now, getConfig().APP_TIMEZONE));
  let rows = await progressRows(childId, saga.manifest.id);
  const existing = rows.find((row) => row.correct && row.levelId === location.levelId &&
    row.questId === location.questId && row.partId === location.partId &&
    row.taskId === location.taskId);
  if (existing) {
    const state = await synchronizeProgress(childId, saga.manifest.id, levels, rows);
    return { correct: true, awardedPoints: 0, duplicate: true,
      totals: calculateTotals(levels, rows), ...state };
  }
  const expected = resolveResume(levels, rows);
  if (!expected) throw new Error("All released tasks are complete");
  if (Object.entries(location).some(([field, value]) =>
    expected[field as keyof TaskLocation] !== value)) throw new Error("Task is locked");
  const task = findTask(levels, location);
  if (!task) throw new Error("Task not found");
  const result = evaluateTask(task, response);
  const storedResponse = response === undefined
    ? null
    : JSON.parse(JSON.stringify(response)) as Json;
  const { data: attemptData, error } = await getServiceSupabase().rpc("record_task_attempt", {
    p_child_id: childId, p_saga_id: saga.manifest.id, p_level_id: location.levelId,
    p_quest_id: location.questId, p_part_id: location.partId, p_task_id: location.taskId,
    p_response: storedResponse, p_correct: result.correct,
    p_variable_key: result.variable?.key ?? null,
    p_variable_value: result.variable?.value ?? null, p_points: result.awardedPoints,
  });
  if (error) throw error;
  const recorded = Array.isArray(attemptData) ? attemptData[0] : attemptData;
  if (!recorded) throw new Error("Task attempt was not recorded");
  rows = await progressRows(childId, saga.manifest.id);
  const state = await synchronizeProgress(childId, saga.manifest.id, levels, rows);
  return {
    correct: recorded.correct,
    awardedPoints: recorded.newly_completed ? recorded.points : 0,
    duplicate: recorded.correct && !recorded.newly_completed,
    totals: calculateTotals(levels, rows), ...state };
}
