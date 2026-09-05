import path from "node:path";
import { SagaValidationError, validateSagaRepository } from "../src/lib/levels/validation";

async function main() {
  const root = path.join(process.cwd(), "content", "sagas");
  try {
    const sagas = await validateSagaRepository(root);
    const levelCount = sagas.reduce((total, saga) => total + saga.levels.length, 0);
    console.log(`Validated ${sagas.length} sagas and ${levelCount} levels.`);
  } catch (error) {
    if (error instanceof SagaValidationError) {
      console.error("Saga validation failed:");
      error.issues.forEach((issue) => console.error(`- ${issue.path}: ${issue.message}`));
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  }
}

void main();
