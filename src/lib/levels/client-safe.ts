import type { Level, Task } from "./schemas";

export type ClientSafeTask = Task extends infer Candidate
  ? Candidate extends Task
    ? Omit<Candidate, "answer">
    : never
  : never;
export type ClientSafeLevel = Omit<Level, "quests"> & {
  quests: Array<
    Omit<Level["quests"][number], "parts"> & {
      parts: Array<
        Omit<Level["quests"][number]["parts"][number], "tasks"> & {
          tasks: ClientSafeTask[];
        }
      >;
    }
  >;
};

export function toClientSafeLevel(level: Level): ClientSafeLevel {
  return {
    ...level,
    quests: level.quests.map((quest) => ({
      ...quest,
      parts: quest.parts.map((part) => ({
        ...part,
        tasks: part.tasks.map((task) => {
          if (task.type === "creative-input") return { ...task };
          const { answer: _answer, ...safeTask } = task;
          void _answer;
          return safeTask;
        }),
      })),
    })),
  };
}
