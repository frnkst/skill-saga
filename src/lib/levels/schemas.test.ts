import { describe, expect, it } from "vitest";
import { taskSchema } from "./schemas";

const base = { id: "task-one", prompt: "Try this", points: 10 };

describe("task schemas", () => {
  it.each([
    {
      ...base,
      type: "single-input",
      answer: { value: "Moon" },
    },
    {
      ...base,
      type: "number-input",
      answer: { value: 4, tolerance: 0.1 },
    },
    {
      ...base,
      type: "multiple-choice",
      presentation: "true-false",
      options: [
        { id: "yes-option", label: "True" },
        { id: "no-option", label: "False" },
      ],
      answer: { optionId: "yes-option" },
    },
    {
      ...base,
      type: "sequence",
      items: [
        { id: "first-item", label: "First" },
        { id: "second-item", label: "Second" },
      ],
      answer: { orderedItemIds: ["first-item", "second-item"] },
    },
    {
      ...base,
      type: "matching",
      left: [
        { id: "left-one", label: "One" },
        { id: "left-two", label: "Two" },
      ],
      right: [
        { id: "right-one", label: "Uno" },
        { id: "right-two", label: "Dos" },
      ],
      answer: {
        pairs: [
          { leftId: "left-one", rightId: "right-one" },
          { leftId: "left-two", rightId: "right-two" },
        ],
      },
    },
    {
      ...base,
      type: "creative-input",
      variableKey: "hero-motto",
      minLength: 2,
      maxLength: 40,
    },
  ])("accepts $type", (task) => {
    expect(taskSchema.safeParse(task).success).toBe(true);
  });

  it("rejects unstable IDs and inconsistent task answers", () => {
    expect(
      taskSchema.safeParse({
        ...base,
        id: "Not Stable",
        type: "multiple-choice",
        options: [
          { id: "one", label: "One" },
          { id: "two", label: "Two" },
        ],
        answer: { optionId: "missing" },
      }).success,
    ).toBe(false);
  });
});
