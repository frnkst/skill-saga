import { describe, expect, it } from "vitest";
import type { Level } from "@/lib/levels/schemas";
import {
  calculateTotals, deriveAchievementKeys, localDate, releasedLevels, resolveResume,
  type TaskCompletion,
} from "./progression";

const makeLevel = (levelNumber: number, date = "2026-09-05"): Level => ({
  id: `level-${levelNumber}`, sagaId: "test-saga", levelNumber,
  title: `Level ${levelNumber}`, date, introduction: "Intro",
  quests: [{ id: `quest-${levelNumber}`, title: "Quest", summary: "Summary",
    parts: [{ id: `part-${levelNumber}`, title: "Part", narrative: "Story",
      tasks: [{ id: `task-${levelNumber}`, type: "number-input", prompt: "Answer",
        points: 4, answer: { value: 1, tolerance: 0 } }],
      reward: {
        stars: 2,
        collectible: { type: "fairy", amount: 1 },
        message: "Part done",
      } }],
    reward: { stars: 3, badge: "Quest badge", message: "Quest done" } }],
  reward: { stars: 5, badge: "Level badge", message: "Level done" },
});

const complete = (levelNumber: number): TaskCompletion => ({
  levelId: `level-${levelNumber}`, questId: `quest-${levelNumber}`,
  partId: `part-${levelNumber}`, taskId: `task-${levelNumber}`,
  correct: true, points: 999,
});

describe("progression helpers", () => {
  it("filters releases in the household timezone", () => {
    expect(localDate(new Date("2026-09-05T00:30:00Z"), "America/Los_Angeles"))
      .toBe("2026-09-04");
    expect(releasedLevels([makeLevel(1), makeLevel(2, "2026-09-06")], "2026-09-05"))
      .toHaveLength(1);
  });

  it("resumes strictly in content order", () => {
    const levels = [makeLevel(1), makeLevel(2)];
    expect(resolveResume(levels, [])?.taskId).toBe("task-1");
    expect(resolveResume(levels, [complete(1)])?.taskId).toBe("task-2");
    expect(resolveResume(levels, [complete(1), complete(2)])).toBeNull();
  });

  it("derives points and nested rewards from authoritative content", () => {
    const levels = [makeLevel(1), makeLevel(2)];
    expect(calculateTotals(levels, [complete(1)])).toEqual({
      points: 4, stars: 10, badges: ["Quest badge", "Level badge"],
      collectibles: { fairy: 1, unicorn: 0, gem: 0, "story-spark": 0 },
    });
    expect(deriveAchievementKeys(levels, [complete(1)]))
      .toEqual(["first-task", "first-level", "ten-stars"]);
  });
});
