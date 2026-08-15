import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("package artifacts", () => {
  it("keeps the React client boundary in emitted JavaScript", async () => {
    const reactEntry = await readFile(new URL("../../dist/react.js", import.meta.url), "utf8");
    expect(reactEntry.startsWith('"use client";')).toBe(true);
  });

  it("keeps React out of the root entry", async () => {
    const rootEntry = await readFile(new URL("../../dist/index.js", import.meta.url), "utf8");
    expect(rootEntry).not.toMatch(/from ["']react/);
  });

  it("bundles source modules behind the public entries", async () => {
    const [rootEntry, reactEntry] = await Promise.all([
      readFile(new URL("../../dist/index.js", import.meta.url), "utf8"),
      readFile(new URL("../../dist/react.js", import.meta.url), "utf8"),
    ]);

    expect(rootEntry).not.toMatch(/from ["']\.\/core\//);
    expect(reactEntry).not.toMatch(/from ["']\.\/react\//);
  });
});
