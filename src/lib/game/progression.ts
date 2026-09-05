import type {
  CollectibleType,
  Level,
  Reward,
  Task,
} from "@/lib/levels/schemas";

export interface TaskCompletion {
  levelId: string;
  questId: string;
  partId: string;
  taskId: string;
  correct: boolean;
  points: number;
  variableKey?: string | null;
  variableValue?: string | null;
}

export interface ResumePosition {
  levelId: string;
  levelNumber: number;
  questId: string;
  partId: string;
  taskId: string;
}

const key = (levelId: string, questId: string, partId: string, taskId: string) =>
  `${levelId}\u0000${questId}\u0000${partId}\u0000${taskId}`;

export function localDate(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function releasedLevels(levels: Level[], today: string): Level[] {
  return levels
    .filter((level) => level.date <= today)
    .sort((a, b) => a.levelNumber - b.levelNumber);
}

export function completedTaskKeys(rows: TaskCompletion[]): Set<string> {
  return new Set(rows.filter((row) => row.correct)
    .map((row) => key(row.levelId, row.questId, row.partId, row.taskId)));
}

export function resolveResume(levels: Level[], rows: TaskCompletion[]): ResumePosition | null {
  const done = completedTaskKeys(rows);
  for (const level of levels) for (const quest of level.quests)
    for (const part of quest.parts) for (const task of part.tasks)
      if (!done.has(key(level.id, quest.id, part.id, task.id)))
        return {
          levelId: level.id, levelNumber: level.levelNumber,
          questId: quest.id, partId: part.id, taskId: task.id,
        };
  return null;
}

function addReward(total: Totals, reward: Reward): void {
  total.stars += reward.stars;
  if (reward.badge) total.badges.push(reward.badge);
  if (reward.collectible) {
    total.collectibles[reward.collectible.type] += reward.collectible.amount;
  }
}

export interface Totals {
  points: number;
  stars: number;
  badges: string[];
  collectibles: Record<CollectibleType, number>;
}

export function calculateTotals(levels: Level[], rows: TaskCompletion[]): Totals {
  const done = completedTaskKeys(rows);
  const total: Totals = {
    points: 0,
    stars: 0,
    badges: [],
    collectibles: { fairy: 0, unicorn: 0, gem: 0, "story-spark": 0 },
  };
  for (const level of levels) {
    let levelComplete = true;
    for (const quest of level.quests) {
      let questComplete = true;
      for (const part of quest.parts) {
        const partComplete = part.tasks.every((task) => {
          const complete = done.has(key(level.id, quest.id, part.id, task.id));
          if (complete) total.points += task.points;
          return complete;
        });
        if (partComplete) addReward(total, part.reward);
        else questComplete = false;
      }
      if (questComplete) addReward(total, quest.reward);
      else levelComplete = false;
    }
    if (levelComplete) addReward(total, level.reward);
  }
  return total;
}

export function deriveAchievementKeys(levels: Level[], rows: TaskCompletion[]): string[] {
  const done = completedTaskKeys(rows);
  const totals = calculateTotals(levels, rows);
  const result: string[] = [];
  if (done.size >= 1) result.push("first-task");
  if (levels.some((level) => level.quests.every((quest) => quest.parts.every((part) =>
    part.tasks.every((task) => done.has(key(level.id, quest.id, part.id, task.id)))))))
    result.push("first-level");
  if (totals.stars >= 10) result.push("ten-stars");
  return result;
}

export function findTask(
  levels: Level[], position: Omit<ResumePosition, "levelNumber">,
): Task | undefined {
  return levels.find((level) => level.id === position.levelId)?.quests
    .find((quest) => quest.id === position.questId)?.parts
    .find((part) => part.id === position.partId)?.tasks
    .find((task) => task.id === position.taskId);
}
