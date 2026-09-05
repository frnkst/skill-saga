import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { sagaManifestSchema } from "../src/lib/levels/schemas";
import { parseArguments, requiredArgument } from "./saga-cli";

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const id = requiredArgument(args, "id");
  const manifest = sagaManifestSchema.parse({
    id,
    title: requiredArgument(args, "title"),
    summary: requiredArgument(args, "summary"),
    ...(args["cover-image"] && { coverImage: args["cover-image"] }),
    audienceNote: requiredArgument(args, "audience-note"),
    levels: [],
  });
  const directory = path.join(process.cwd(), "content", "sagas", id);

  await mkdir(directory, { recursive: false });
  await writeFile(
    path.join(directory, "saga.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { flag: "wx" },
  );
  console.log(`Created ${path.relative(process.cwd(), directory)}/saga.json`);
}

void main();
