export interface TemplateContext {
  hero: { name: string };
  sidekicks: string[];
  answers: Readonly<Record<string, string>>;
}

const PLACEHOLDER = /{{(hero\.name|sidekicks\.(\d+)|answers\.([a-z0-9]+(?:-[a-z0-9]+)*))}}/g;

export function interpolatePlainText(template: string, context: TemplateContext): string {
  const remainder = template.replace(PLACEHOLDER, "");
  if (remainder.includes("{{") || remainder.includes("}}")) {
    throw new Error("Template contains an unsafe or malformed placeholder");
  }
  return template.replace(
    PLACEHOLDER,
    (_placeholder, key: string, sidekickIndex?: string, answerKey?: string) => {
      let value: string | undefined;
      if (key === "hero.name") value = context.hero.name;
      else if (sidekickIndex !== undefined) value = context.sidekicks[Number(sidekickIndex)];
      else if (answerKey !== undefined) value = context.answers[answerKey];
      if (value === undefined) throw new Error(`No value supplied for {{${key}}}`);
      return value;
    },
  );
}
