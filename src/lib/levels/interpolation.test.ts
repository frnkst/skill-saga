import { describe, expect, it } from "vitest";
import { interpolatePlainText } from "./interpolation";

const context = {
  hero: { name: "<Ada>" },
  sidekicks: ["Pip & Pop"],
  answers: { "magic-word": "<script>alert(1)</script>" },
};

describe("interpolatePlainText", () => {
  it("substitutes only supported values as plain text", () => {
    expect(
      interpolatePlainText(
        "{{hero.name}} and {{sidekicks.0}} shout {{answers.magic-word}}",
        context,
      ),
    ).toBe("<Ada> and Pip & Pop shout <script>alert(1)</script>");
  });

  it("rejects unsafe, malformed, and unavailable placeholders", () => {
    expect(() => interpolatePlainText("{{constructor.name}}", context)).toThrow();
    expect(() => interpolatePlainText("{{hero.name", context)).toThrow();
    expect(() => interpolatePlainText("{{answers.unknown}}", context)).toThrow();
  });
});
