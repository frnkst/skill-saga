import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SagaValidationError,
  validateSagaDirectory,
  validateSagaRepository,
} from "./validation";
import type { Level, SagaManifest } from "./schemas";

const fixtureBase = path.join(process.cwd(), ".saga-test-fixtures");
let fixtureRoot: string;
let fixtureSaga: string;

async function updateJson<Document>(
  file: string,
  update: (value: Document) => void,
): Promise<void> {
  const value = JSON.parse(await readFile(file, "utf8")) as Document;
  update(value);
  await writeFile(file, JSON.stringify(value));
}

beforeEach(async () => {
  fixtureRoot = path.join(
    fixtureBase,
    `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );
  fixtureSaga = path.join(fixtureRoot, "saga-1");
  await mkdir(fixtureRoot, { recursive: true });
  await cp(path.join(process.cwd(), "content", "sagas", "saga-1"), fixtureSaga, {
    recursive: true,
  });
});

afterEach(async () => {
  await rm(fixtureRoot, { recursive: true, force: true });
});

afterAll(async () => {
  await rm(fixtureBase, { recursive: true, force: true });
});

describe("repository validation", () => {
  it("loads valid sagas in level order", async () => {
    const sagas = await validateSagaRepository(
      path.join(process.cwd(), "content", "sagas"),
    );
    expect(sagas).toHaveLength(2);
    expect(sagas[0].levels[0].levelNumber).toBe(1);
  });

  it("rejects forward answer references and duplicate creative variables", async () => {
    const levelFile = path.join(fixtureSaga, "level1.json");
    await updateJson<Level>(levelFile, (level) => {
      level.introduction = "{{answers.moth-name}} appears too soon.";
      level.quests[1].parts[1].tasks.push({
        id: "another-creative-task",
        type: "creative-input",
        prompt: "Name it again",
        points: 1,
        variableKey: "moth-name",
        minLength: 1,
        maxLength: 500,
        multiline: true,
      });
    });
    await expect(validateSagaDirectory(fixtureSaga)).rejects.toSatisfy(
      (error: SagaValidationError) =>
        error.issues.some((issue) => issue.message.includes("forward-referenced")) &&
        error.issues.some((issue) => issue.message.includes("duplicate creative")),
    );
  });

  it("rejects duplicate IDs and unsafe or malformed placeholders", async () => {
    const levelFile = path.join(fixtureSaga, "level1.json");
    await updateJson<Level>(levelFile, (level) => {
      level.quests[1].id = level.quests[0].id;
      level.quests[0].summary = "{{hero.password}} and {{answers.}}";
    });
    await expect(validateSagaDirectory(fixtureSaga)).rejects.toSatisfy(
      (error: SagaValidationError) =>
        error.issues.some((issue) => issue.message.includes("duplicate ID")) &&
        error.issues.some((issue) => issue.message.includes("unsafe placeholder")),
    );
  });

  it("rejects level gaps and folder/manifest/level mismatches", async () => {
    await updateJson<SagaManifest>(path.join(fixtureSaga, "saga.json"), (manifest) => {
      manifest.id = "wrong-saga";
      manifest.levels[0].file = "level2.json";
      manifest.levels[0].levelNumber = 2;
    });
    await updateJson<Level>(path.join(fixtureSaga, "level1.json"), (level) => {
      level.sagaId = "another-saga";
      level.levelNumber = 2;
    });
    await expect(validateSagaDirectory(fixtureSaga)).rejects.toSatisfy(
      (error: SagaValidationError) =>
        error.issues.some((issue) => issue.message.includes("folder")) &&
        error.issues.some((issue) => issue.message.includes("levelNumber")) &&
        error.issues.some((issue) => issue.message.includes("sagaId")),
    );
  });

  it("rejects non-sequential filenames", async () => {
    await cp(
      path.join(fixtureSaga, "level1.json"),
      path.join(fixtureSaga, "level3.json"),
    );
    await expect(validateSagaDirectory(fixtureSaga)).rejects.toSatisfy(
      (error: SagaValidationError) =>
        error.issues.some((issue) => issue.message.includes("sequential")),
    );
  });

  it("rejects decreasing release dates", async () => {
    const firstFile = path.join(fixtureSaga, "level1.json");
    const secondFile = path.join(fixtureSaga, "level2.json");
    const second = JSON.parse(await readFile(firstFile, "utf8")) as Level;
    second.id = "earlier-second-level";
    second.levelNumber = 2;
    second.title = "Earlier second level";
    second.date = "2026-09-04";
    await writeFile(secondFile, JSON.stringify(second));
    await updateJson<SagaManifest>(path.join(fixtureSaga, "saga.json"), (manifest) => {
      manifest.levels.push({
        id: second.id,
        levelNumber: 2,
        file: "level2.json",
        title: second.title,
      });
    });

    await expect(validateSagaDirectory(fixtureSaga)).rejects.toSatisfy(
      (error: SagaValidationError) =>
        error.issues.some((issue) => issue.message.includes("release dates")),
    );
  });

  it("rejects unsupported sidekick indexes", async () => {
    const levelFile = path.join(fixtureSaga, "level1.json");
    await updateJson<Level>(levelFile, (level) => {
      level.introduction = "{{sidekicks.12}} packed the snacks.";
    });
    await expect(validateSagaDirectory(fixtureSaga)).rejects.toSatisfy(
      (error: SagaValidationError) =>
        error.issues.some((issue) => issue.message.includes("supported 12 names")),
    );
  });
});
