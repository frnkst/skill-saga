import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { levelSchema, sagaManifestSchema, type Level, type SagaManifest } from "./schemas";

export interface SagaContent {
  manifest: SagaManifest;
  levels: Level[];
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export class SagaValidationError extends Error {
  constructor(public readonly issues: ValidationIssue[]) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
    this.name = "SagaValidationError";
  }
}

const TEMPLATE_PATTERN = /{{[^{}]*}}/g;
const SAFE_TEMPLATE_PATTERN =
  /^{{(hero\.name|sidekicks\.((?:0|[1-9]\d*))|answers\.([a-z0-9]+(?:-[a-z0-9]+)*))}}$/;

function validateTemplates(
  value: unknown,
  availableVariables: ReadonlySet<string>,
  location: string,
  issues: ValidationIssue[],
): void {
  if (typeof value === "string") {
    const matches = value.match(TEMPLATE_PATTERN) ?? [];
    const unmatched = value.replace(TEMPLATE_PATTERN, "");
    if (unmatched.includes("{{") || unmatched.includes("}}")) {
      issues.push({ path: location, message: "malformed template placeholder" });
    }
    for (const placeholder of matches) {
      const safe = SAFE_TEMPLATE_PATTERN.exec(placeholder);
      if (!safe) {
        issues.push({ path: location, message: `unsafe placeholder ${placeholder}` });
      } else if (safe[2] && Number(safe[2]) >= 12) {
        issues.push({
          path: location,
          message: `sidekick reference ${placeholder} exceeds the supported 12 names`,
        });
      } else if (safe[3] && !availableVariables.has(safe[3])) {
        issues.push({
          path: location,
          message: `answer reference ${placeholder} is unavailable or forward-referenced`,
        });
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      validateTemplates(entry, availableVariables, `${location}[${index}]`, issues),
    );
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      validateTemplates(entry, availableVariables, `${location}.${key}`, issues);
    }
  }
}

function registerId(
  id: string,
  location: string,
  ids: Map<string, string>,
  issues: ValidationIssue[],
): void {
  const previous = ids.get(id);
  if (previous) {
    issues.push({ path: location, message: `duplicate ID "${id}" (first at ${previous})` });
  } else {
    ids.set(id, location);
  }
}

function validateLevelContent(
  level: Level,
  file: string,
  ids: Map<string, string>,
  variables: Map<string, string>,
  issues: ValidationIssue[],
): void {
  registerId(level.id, `${file}.id`, ids, issues);
  const available = new Set(variables.keys());
  validateTemplates(
    {
      title: level.title,
      introduction: level.introduction,
    },
    available,
    file,
    issues,
  );

  level.quests.forEach((quest, questIndex) => {
    const questPath = `${file}.quests[${questIndex}]`;
    registerId(quest.id, `${questPath}.id`, ids, issues);
    validateTemplates(
      { title: quest.title, summary: quest.summary },
      available,
      questPath,
      issues,
    );
    quest.parts.forEach((part, partIndex) => {
      const partPath = `${questPath}.parts[${partIndex}]`;
      registerId(part.id, `${partPath}.id`, ids, issues);
      validateTemplates(
        { title: part.title, narrative: part.narrative },
        available,
        partPath,
        issues,
      );
      part.tasks.forEach((task, taskIndex) => {
        const taskPath = `${partPath}.tasks[${taskIndex}]`;
        registerId(task.id, `${taskPath}.id`, ids, issues);
        validateTemplates(task, available, taskPath, issues);
        if (task.type === "multiple-choice" || task.type === "sequence") {
          const entries = task.type === "multiple-choice" ? task.options : task.items;
          entries.forEach((entry, entryIndex) =>
            registerId(entry.id, `${taskPath}.items[${entryIndex}].id`, ids, issues),
          );
        } else if (task.type === "matching") {
          [...task.left, ...task.right].forEach((entry, entryIndex) =>
            registerId(entry.id, `${taskPath}.matching[${entryIndex}].id`, ids, issues),
          );
        }

        if (task.type === "creative-input") {
          const previous = variables.get(task.variableKey);
          if (previous) {
            issues.push({
              path: `${taskPath}.variableKey`,
              message: `duplicate creative variable "${task.variableKey}" (first at ${previous})`,
            });
          } else {
            variables.set(task.variableKey, taskPath);
            available.add(task.variableKey);
          }
        }
      });
      validateTemplates(part.reward, available, `${partPath}.reward`, issues);
    });
    validateTemplates(quest.reward, available, `${questPath}.reward`, issues);
  });
  validateTemplates(level.reward, available, `${file}.reward`, issues);
}

async function readJson(file: string, issues: ValidationIssue[]): Promise<unknown> {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    issues.push({
      path: file,
      message: error instanceof Error ? error.message : "could not read JSON",
    });
    return undefined;
  }
}

export async function validateSagaDirectory(sagaDirectory: string): Promise<SagaContent> {
  const issues: ValidationIssue[] = [];
  const manifestFile = path.join(sagaDirectory, "saga.json");
  const manifestResult = sagaManifestSchema.safeParse(
    await readJson(manifestFile, issues),
  );
  if (!manifestResult.success) {
    issues.push(
      ...manifestResult.error.issues.map((issue) => ({
        path: `${manifestFile}.${issue.path.join(".")}`,
        message: issue.message,
      })),
    );
    throw new SagaValidationError(issues);
  }
  const manifest = manifestResult.data;
  const folder = path.basename(sagaDirectory);
  if (folder !== manifest.id) {
    issues.push({
      path: manifestFile,
      message: `folder "${folder}" does not match manifest ID "${manifest.id}"`,
    });
  }

  const entries = await readdir(sagaDirectory);
  const numberedFiles = entries
    .map((file) => ({ file, match: /^level(\d+)\.json$/.exec(file) }))
    .filter((entry): entry is { file: string; match: RegExpExecArray } => Boolean(entry.match))
    .map(({ file, match }) => ({ file, number: Number(match[1]) }))
    .sort((a, b) => a.number - b.number);
  numberedFiles.forEach((entry, index) => {
    if (entry.number !== index + 1) {
      issues.push({
        path: sagaDirectory,
        message: `level filenames must be sequential from level1.json; found ${entry.file}`,
      });
    }
  });
  if (manifest.levels.length !== numberedFiles.length) {
    issues.push({
      path: manifestFile,
      message: "manifest level list must contain every level file exactly once",
    });
  }

  const levels: Level[] = [];
  for (const entry of numberedFiles) {
    const file = path.join(sagaDirectory, entry.file);
    const result = levelSchema.safeParse(await readJson(file, issues));
    if (!result.success) {
      issues.push(
        ...result.error.issues.map((issue) => ({
          path: `${file}.${issue.path.join(".")}`,
          message: issue.message,
        })),
      );
      continue;
    }
    const level = result.data;
    const reference = manifest.levels[entry.number - 1];
    if (level.levelNumber !== entry.number) {
      issues.push({
        path: file,
        message: `levelNumber ${level.levelNumber} does not match ${entry.file}`,
      });
    }
    if (level.sagaId !== manifest.id) {
      issues.push({
        path: file,
        message: `sagaId "${level.sagaId}" does not match "${manifest.id}"`,
      });
    }
    if (
      !reference ||
      reference.file !== entry.file ||
      reference.levelNumber !== entry.number ||
      reference.id !== level.id ||
      reference.title !== level.title
    ) {
      issues.push({
        path: manifestFile,
        message: `manifest entry for ${entry.file} does not match the level`,
      });
    }
    levels.push(level);
  }

  const ids = new Map<string, string>();
  registerId(manifest.id, `${manifestFile}.id`, ids, issues);
  const variables = new Map<string, string>();
  levels
    .sort((a, b) => a.levelNumber - b.levelNumber)
    .forEach((level) =>
      validateLevelContent(
        level,
        path.join(sagaDirectory, `level${level.levelNumber}.json`),
        ids,
        variables,
        issues,
      ),
    );
  for (let index = 1; index < levels.length; index += 1) {
    if (levels[index].date < levels[index - 1].date) {
      issues.push({
        path: path.join(sagaDirectory, `level${levels[index].levelNumber}.json.date`),
        message: "level release dates must not decrease as level numbers increase",
      });
    }
  }

  if (issues.length) throw new SagaValidationError(issues);
  return { manifest, levels };
}

export async function validateSagaRepository(root: string): Promise<SagaContent[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const results = await Promise.allSettled(
    directories.map((directory) => validateSagaDirectory(path.join(root, directory))),
  );
  const issues = results.flatMap((result) =>
    result.status === "rejected"
      ? result.reason instanceof SagaValidationError
        ? result.reason.issues
        : [{ path: root, message: String(result.reason) }]
      : [],
  );
  if (issues.length) throw new SagaValidationError(issues);
  return results
    .filter((result): result is PromiseFulfilledResult<SagaContent> => result.status === "fulfilled")
    .map((result) => result.value);
}
