import { describe, expect, it } from "vitest";
import { toClientSafeLevel } from "./client-safe";
import { evaluateTask } from "./evaluate";
import { levelSchema, taskSchema } from "./schemas";

const parseTask = (task: Record<string, unknown>) =>
  taskSchema.parse({ id: "test-task", prompt: "Question?", points: 7, ...task });

describe("evaluateTask", () => {
  it("evaluates text and numeric answers", () => {
    const text = parseTask({
      type: "single-input",
      answer: { value: "Bright Moon" },
    });
    const number = parseTask({
      type: "number-input",
      answer: { value: 10, tolerance: 0.5 },
    });
    expect(evaluateTask(text, "  BRIGHT   moon ")).toEqual({
      correct: true,
      awardedPoints: 7,
    });
    expect(evaluateTask(number, "10.4").correct).toBe(true);
    expect(evaluateTask(number, "eleven").correct).toBe(false);
  });

  it("evaluates choice, sequence, and matching without returning solutions", () => {
    const choice = parseTask({
      type: "multiple-choice",
      options: [
        { id: "red", label: "Red" },
        { id: "blue", label: "Blue" },
      ],
      answer: { optionId: "blue" },
    });
    const sequence = parseTask({
      type: "sequence",
      items: [
        { id: "one", label: "1" },
        { id: "two", label: "2" },
      ],
      answer: { orderedItemIds: ["one", "two"] },
    });
    const matching = parseTask({
      type: "matching",
      left: [
        { id: "cat", label: "Cat" },
        { id: "dog", label: "Dog" },
      ],
      right: [
        { id: "meow", label: "Meow" },
        { id: "woof", label: "Woof" },
      ],
      answer: {
        pairs: [
          { leftId: "cat", rightId: "meow" },
          { leftId: "dog", rightId: "woof" },
        ],
      },
    });
    expect(evaluateTask(choice, "blue").correct).toBe(true);
    expect(evaluateTask(sequence, ["two", "one"]).correct).toBe(false);
    expect(
      evaluateTask(matching, [
        { leftId: "dog", rightId: "woof" },
        { leftId: "cat", rightId: "meow" },
      ]).correct,
    ).toBe(true);
    expect(evaluateTask(choice, "red")).not.toHaveProperty("answer");
  });

  it("captures a valid creative value", () => {
    const task = parseTask({
      type: "creative-input",
      variableKey: "ship-name",
      minLength: 3,
      maxLength: 20,
    });
    expect(evaluateTask(task, "  Starling  ")).toEqual({
      correct: true,
      awardedPoints: 7,
      variable: { key: "ship-name", value: "Starling" },
    });
  });
});

describe("toClientSafeLevel", () => {
  it("removes canonical answers recursively", () => {
    const level = levelSchema.parse({
      id: "level-one",
      sagaId: "saga-one",
      levelNumber: 1,
      title: "Level",
      date: "2026-09-05",
      introduction: "Hello",
      quests: [
        {
          id: "quest-one",
          title: "Quest",
          summary: "Summary",
          parts: [{
            id: "part-one",
            title: "Part",
            narrative: "Story",
            tasks: [{
              id: "answer-task",
              type: "single-input",
              prompt: "Word?",
              points: 1,
              answer: { value: "secret" },
            }],
            reward: { stars: 1, message: "Done" },
          }],
          reward: { stars: 1, message: "Done" },
        },
        {
          id: "quest-two",
          title: "Quest two",
          summary: "Another chapter",
          parts: [{
            id: "part-two",
            title: "Part two",
            narrative: "More story",
            tasks: [{
              id: "creative-task",
              type: "creative-input",
              prompt: "Name it",
              points: 1,
              variableKey: "thing-name",
            }],
            reward: { stars: 1, message: "Done" },
          }],
          reward: { stars: 1, message: "Done" },
        },
      ],
      reward: { stars: 1, message: "Done" },
    });
    expect(JSON.stringify(toClientSafeLevel(level))).not.toContain("secret");
    expect(toClientSafeLevel(level).quests[0].parts[0].tasks[0]).not.toHaveProperty(
      "answer",
    );
  });
});
