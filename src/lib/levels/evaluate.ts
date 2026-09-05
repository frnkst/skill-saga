import type { Task } from "./schemas";

export interface EvaluationResult {
  correct: boolean;
  awardedPoints: number;
  variable?: { key: string; value: string };
}

const normalize = (value: string, caseSensitive = false) => {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return caseSensitive ? trimmed : trimmed.toLocaleLowerCase();
};

export function evaluateTask(task: Task, submission: unknown): EvaluationResult {
  let correct = false;
  let variable: EvaluationResult["variable"];

  switch (task.type) {
    case "single-input":
      correct =
        typeof submission === "string" &&
        normalize(submission, task.answer.caseSensitive) ===
          normalize(task.answer.value, task.answer.caseSensitive);
      break;
    case "number-input": {
      const value =
        typeof submission === "number"
          ? submission
          : typeof submission === "string" && submission.trim() !== ""
            ? Number(submission)
            : Number.NaN;
      correct =
        Number.isFinite(value) &&
        Math.abs(value - task.answer.value) <= task.answer.tolerance;
      break;
    }
    case "multiple-choice":
      correct = submission === task.answer.optionId;
      break;
    case "sequence":
      correct =
        Array.isArray(submission) &&
        submission.every((item): item is string => typeof item === "string") &&
        submission.length === task.answer.orderedItemIds.length &&
        submission.every((item, index) => item === task.answer.orderedItemIds[index]);
      break;
    case "matching": {
      if (
        Array.isArray(submission) &&
        submission.every(
          (pair) =>
            pair &&
            typeof pair === "object" &&
            typeof pair.leftId === "string" &&
            typeof pair.rightId === "string",
        )
      ) {
        const submitted = new Set(
          submission.map((pair) => `${pair.leftId}\u0000${pair.rightId}`),
        );
        correct =
          submitted.size === task.answer.pairs.length &&
          task.answer.pairs.every((pair) =>
            submitted.has(`${pair.leftId}\u0000${pair.rightId}`),
          );
      }
      break;
    }
    case "creative-input":
      if (typeof submission === "string") {
        const value = submission.trim();
        correct = value.length >= task.minLength && value.length <= task.maxLength;
        if (correct) variable = { key: task.variableKey, value };
      }
      break;
  }

  return { correct, awardedPoints: correct ? task.points : 0, ...(variable && { variable }) };
}
