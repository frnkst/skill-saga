import { access } from "node:fs/promises";
import path from "node:path";
import { toClientSafeLevel, type ClientSafeLevel } from "./client-safe";
import {
  validateSagaDirectory,
  validateSagaRepository,
  type SagaContent,
} from "./validation";

const defaultRoot = () => path.join(process.cwd(), "content", "sagas");

export async function loadSagas(root = defaultRoot()): Promise<SagaContent[]> {
  await access(root);
  return validateSagaRepository(root);
}

export async function loadSaga(id: string, root = defaultRoot()): Promise<SagaContent> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error("Invalid saga ID");
  return validateSagaDirectory(path.join(root, id));
}

export async function loadClientSafeLevel(
  sagaId: string,
  levelNumber: number,
  root = defaultRoot(),
): Promise<ClientSafeLevel> {
  if (!Number.isSafeInteger(levelNumber) || levelNumber < 1) {
    throw new Error("Invalid level number");
  }
  const saga = await loadSaga(sagaId, root);
  const level = saga.levels.find((candidate) => candidate.levelNumber === levelNumber);
  if (!level) throw new Error(`Level ${levelNumber} was not found in ${sagaId}`);
  return toClientSafeLevel(level);
}
