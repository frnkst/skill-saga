import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  levelSchema,
  sagaManifestSchema,
  stableIdSchema,
} from "../src/lib/levels/schemas";
import { parseArguments, requiredArgument } from "./saga-cli";

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const sagaId = requiredArgument(args, "saga");
  stableIdSchema.parse(sagaId);
  const title = requiredArgument(args, "title");
  const date = args.date ?? new Date().toISOString().slice(0, 10);
  const directory = path.join(process.cwd(), "content", "sagas", sagaId);
  const manifestFile = path.join(directory, "saga.json");
  const manifest = sagaManifestSchema.parse(
    JSON.parse(await readFile(manifestFile, "utf8")),
  );
  if (manifest.id !== sagaId) throw new Error("Saga folder and manifest ID do not match");

  const levelNumber = manifest.levels.length + 1;
  const id = args.id ?? `level-${levelNumber}`;
  stableIdSchema.parse(id);
  const level = levelSchema.parse({
  id,
  sagaId,
  levelNumber,
  title,
  date,
  introduction: "{{hero.name}} arrives with {{sidekicks.0}} for a new adventure.",
  quests: [
    {
      id: `${id}-quest`,
      title: "The New Quest",
      summary: "Discover a clue and use it to complete the quest.",
      parts: [{
          id: `${id}-idea`,
          title: "Invent a Clue",
          narrative: "A blank sign is waiting for a wonderful idea.",
          tasks: [
            {
              id: `${id}-creative-task`,
              type: "creative-input",
              prompt: "Write a name for the secret clue.",
              points: 5,
              variableKey: `${id}-clue`,
              minLength: 2,
              maxLength: 80,
              multiline: false,
            },
          ],
          reward: { stars: 1, message: "The new clue begins to glow." },
        }],
      reward: { stars: 1, message: "The first quest is complete." },
    },
    {
      id: `${id}-second-quest`,
      title: "Follow the Clue",
      summary: "Use the new clue to open the path ahead.",
      parts: [{
          id: `${id}-recall`,
          title: "Use the Clue",
          narrative: "The sign now reads: {{answers." + `${id}-clue` + "}}.",
          tasks: [
            {
              id: `${id}-number-task`,
              type: "number-input",
              prompt: "How many points does a triangle have?",
              points: 10,
              answer: { value: 3, tolerance: 0 },
            },
          ],
          reward: { stars: 1, message: "The path opens." },
        }],
      reward: { stars: 1, message: "The second quest is complete." },
    },
  ],
  reward: { stars: 2, message: "A new level badge is unlocked." },
  });
  const levelFileName = `level${levelNumber}.json`;
  const nextManifest = sagaManifestSchema.parse({
    ...manifest,
    levels: [
      ...manifest.levels,
      { id, levelNumber, file: levelFileName, title },
    ],
  });

  await writeFile(
    path.join(directory, levelFileName),
    `${JSON.stringify(level, null, 2)}\n`,
    { flag: "wx" },
  );
  await writeFile(manifestFile, `${JSON.stringify(nextManifest, null, 2)}\n`);
  console.log(`Created ${path.relative(process.cwd(), path.join(directory, levelFileName))}`);
}

void main();
