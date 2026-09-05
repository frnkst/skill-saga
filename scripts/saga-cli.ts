export function parseArguments(argv: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (!argument.startsWith("--")) continue;
    const [rawKey, inlineValue] = argument.slice(2).split("=", 2);
    const next = argv[index + 1];
    if (inlineValue !== undefined) result[rawKey] = inlineValue;
    else if (next && !next.startsWith("--")) {
      result[rawKey] = next;
      index += 1;
    } else {
      throw new Error(`Missing value for --${rawKey}`);
    }
  }
  return result;
}

export function requiredArgument(
  argumentsByName: Record<string, string>,
  name: string,
): string {
  const value = argumentsByName[name]?.trim();
  if (!value) throw new Error(`Missing required argument --${name}`);
  return value;
}
