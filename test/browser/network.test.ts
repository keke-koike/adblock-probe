import { describe, expect, it } from "vitest";

import { createAdBlockDetector } from "../../src/index";

const expectedText = "probe-ok\n";

describe("network probe", () => {
  it("returns false when control and bait both match", async () => {
    const detector = createAdBlockDetector({
      dom: false,
      network: {
        controlUrl: "/adblock-probe/control.txt",
        baitUrl: "/ads/advertisement.txt",
        expectedText,
      },
    });

    await expect(detector.detect()).resolves.toEqual({ detected: false });
    detector.dispose();
  });

  it("returns true when only the bait fails", async () => {
    const detector = createAdBlockDetector({
      dom: false,
      network: {
        controlUrl: "/adblock-probe/control.txt",
        baitUrl: "/ads/missing-advertisement.txt",
        expectedText,
      },
    });

    await expect(detector.detect()).resolves.toEqual({ detected: true });
    detector.dispose();
  });

  it("returns null when the control fails", async () => {
    const detector = createAdBlockDetector({
      dom: false,
      network: {
        controlUrl: "/probe/missing-control.txt",
        baitUrl: "/ads/missing-advertisement.txt",
        expectedText,
      },
    });

    await expect(detector.detect()).resolves.toEqual({ detected: null });
    detector.dispose();
  });
});
