import { z } from "zod";

export const stableIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be a kebab-case stable ID");

export const variableKeySchema = stableIdSchema;

const nonEmptyText = z.string().trim().min(1);
const pointsSchema = z.number().int().nonnegative();
export const collectibleTypeSchema = z.enum([
  "fairy",
  "unicorn",
  "gem",
  "story-spark",
]);

export const rewardSchema = z
  .object({
    stars: z.number().int().nonnegative(),
    collectible: z
      .object({
        type: collectibleTypeSchema,
        amount: z.number().int().positive(),
      })
      .strict()
      .optional(),
    badge: nonEmptyText.optional(),
    message: nonEmptyText,
  })
  .strict();

const taskBase = {
  id: stableIdSchema,
  prompt: nonEmptyText,
  points: pointsSchema,
  hint: nonEmptyText.optional(),
};

export const singleInputTaskSchema = z
  .object({
    ...taskBase,
    type: z.literal("single-input"),
    placeholder: z.string().optional(),
    answer: z
      .object({
        value: nonEmptyText,
        caseSensitive: z.boolean().default(false),
      })
      .strict(),
  })
  .strict();

export const numberInputTaskSchema = z
  .object({
    ...taskBase,
    type: z.literal("number-input"),
    answer: z
      .object({
        value: z.number().finite(),
        tolerance: z.number().finite().nonnegative().default(0),
      })
      .strict(),
  })
  .strict();

const choiceOptionSchema = z
  .object({ id: stableIdSchema, label: nonEmptyText })
  .strict();

export const multipleChoiceTaskSchema = z
  .object({
    ...taskBase,
    type: z.literal("multiple-choice"),
    presentation: z.enum(["choice", "true-false"]).default("choice"),
    options: z.array(choiceOptionSchema).min(2),
    answer: z.object({ optionId: stableIdSchema }).strict(),
  })
  .strict()
  .superRefine((task, context) => {
    const optionIds = task.options.map((option) => option.id);
    if (new Set(optionIds).size !== optionIds.length) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "option IDs must be unique",
      });
    }
    if (!optionIds.includes(task.answer.optionId)) {
      context.addIssue({
        code: "custom",
        path: ["answer", "optionId"],
        message: "answer must identify an option",
      });
    }
    if (
      task.presentation === "true-false" &&
      (task.options.length !== 2 ||
        !task.options.every((option) =>
          ["true", "false"].includes(option.label.toLowerCase()),
        ))
    ) {
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "true-false tasks require exactly True and False options",
      });
    }
  });

const sequenceItemSchema = z
  .object({ id: stableIdSchema, label: nonEmptyText })
  .strict();

export const sequenceTaskSchema = z
  .object({
    ...taskBase,
    type: z.literal("sequence"),
    items: z.array(sequenceItemSchema).min(2),
    answer: z.object({ orderedItemIds: z.array(stableIdSchema).min(2) }).strict(),
  })
  .strict()
  .superRefine((task, context) => {
    const itemIds = task.items.map((item) => item.id);
    const answerIds = task.answer.orderedItemIds;
    if (
      new Set(itemIds).size !== itemIds.length ||
      new Set(answerIds).size !== answerIds.length ||
      itemIds.length !== answerIds.length ||
      itemIds.some((id) => !answerIds.includes(id))
    ) {
      context.addIssue({
        code: "custom",
        path: ["answer", "orderedItemIds"],
        message: "answer must contain each unique item ID exactly once",
      });
    }
  });

const matchingSideSchema = z
  .object({ id: stableIdSchema, label: nonEmptyText })
  .strict();
const matchingPairSchema = z
  .object({ leftId: stableIdSchema, rightId: stableIdSchema })
  .strict();

export const matchingTaskSchema = z
  .object({
    ...taskBase,
    type: z.literal("matching"),
    left: z.array(matchingSideSchema).min(2),
    right: z.array(matchingSideSchema).min(2),
    answer: z.object({ pairs: z.array(matchingPairSchema).min(2) }).strict(),
  })
  .strict()
  .superRefine((task, context) => {
    const leftIds = task.left.map((item) => item.id);
    const rightIds = task.right.map((item) => item.id);
    const pairLeft = task.answer.pairs.map((pair) => pair.leftId);
    const pairRight = task.answer.pairs.map((pair) => pair.rightId);
    const isPermutation = (source: string[], target: string[]) =>
      source.length === target.length &&
      new Set(source).size === source.length &&
      new Set(target).size === target.length &&
      source.every((id) => target.includes(id));
    if (
      !isPermutation(leftIds, pairLeft) ||
      !isPermutation(rightIds, pairRight)
    ) {
      context.addIssue({
        code: "custom",
        path: ["answer", "pairs"],
        message: "pairs must match every unique left and right item exactly once",
      });
    }
  });

export const creativeInputTaskSchema = z
  .object({
    ...taskBase,
    type: z.literal("creative-input"),
    variableKey: variableKeySchema,
    minLength: z.number().int().positive().default(1),
    maxLength: z.number().int().positive().max(2_000).default(500),
    multiline: z.boolean().default(true),
  })
  .strict()
  .refine((task) => task.maxLength >= task.minLength, {
    path: ["maxLength"],
    message: "maxLength must be greater than or equal to minLength",
  });

export const taskSchema = z.discriminatedUnion("type", [
  singleInputTaskSchema,
  numberInputTaskSchema,
  multipleChoiceTaskSchema,
  sequenceTaskSchema,
  matchingTaskSchema,
  creativeInputTaskSchema,
]);

export const partSchema = z
  .object({
    id: stableIdSchema,
    title: nonEmptyText,
    narrative: nonEmptyText,
    tasks: z.array(taskSchema).min(1),
    reward: rewardSchema,
  })
  .strict();

export const questSchema = z
  .object({
    id: stableIdSchema,
    title: nonEmptyText,
    summary: nonEmptyText,
    parts: z.array(partSchema).min(1),
    reward: rewardSchema,
  })
  .strict();

export const levelSchema = z
  .object({
    id: stableIdSchema,
    sagaId: stableIdSchema,
    levelNumber: z.number().int().positive(),
    title: nonEmptyText,
    date: z.iso.date(),
    introduction: nonEmptyText,
    quests: z.array(questSchema).min(2, "a level must contain at least two quests"),
    reward: rewardSchema,
  })
  .strict();

export const sagaLevelReferenceSchema = z
  .object({
    id: stableIdSchema,
    levelNumber: z.number().int().positive(),
    file: z.string().regex(/^level[1-9]\d*\.json$/),
    title: nonEmptyText,
  })
  .strict();

export const sagaManifestSchema = z
  .object({
    id: stableIdSchema,
    title: nonEmptyText,
    summary: nonEmptyText,
    coverImage: nonEmptyText.optional(),
    audienceNote: nonEmptyText,
    levels: z.array(sagaLevelReferenceSchema),
  })
  .strict();

export type SagaManifest = z.infer<typeof sagaManifestSchema>;
export type Level = z.infer<typeof levelSchema>;
export type Task = z.infer<typeof taskSchema>;
export type CreativeInputTask = z.infer<typeof creativeInputTaskSchema>;
export type Reward = z.infer<typeof rewardSchema>;
export type CollectibleType = z.infer<typeof collectibleTypeSchema>;
