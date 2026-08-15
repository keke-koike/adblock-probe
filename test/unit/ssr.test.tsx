import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { useAdBlockDetector } from "../../src/react";

function ServerConsumer() {
  const { detected } = useAdBlockDetector();
  return <output>{detected === null ? "unknown" : String(detected)}</output>;
}

describe("React SSR", () => {
  it("renders the stable unknown server snapshot without a DOM", () => {
    expect(renderToString(<ServerConsumer />)).toContain("unknown");
  });
});
