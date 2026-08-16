import { afterEach, describe, expect, it } from "vitest";

import { createAdBlockDetector } from "../../src/index";

afterEach(() => {
  document.head.querySelectorAll("[data-probe-test-style]").forEach((element) => element.remove());
  document.body.replaceChildren();
});

describe("DOM probe", () => {
  it("returns false and removes its temporary elements when the bait remains visible", async () => {
    const detector = createAdBlockDetector({ dom: { timeoutMs: 50 } });

    await expect(detector.detect()).resolves.toEqual({ detected: false });
    expect(document.getElementById("ad-banner")).toBeNull();
    expect(document.querySelector(".adsbox")).toBeNull();
    detector.dispose();
  });

  it("detects cosmetic hiding", async () => {
    const style = document.createElement("style");
    style.dataset.probeTestStyle = "";
    style.textContent = "#ad-banner { display: none !important; }";
    document.head.append(style);
    const detector = createAdBlockDetector({ dom: { timeoutMs: 50 } });

    await expect(detector.detect()).resolves.toEqual({ detected: true });
    detector.dispose();
  });

  it("does not treat a non-zero bait resize as blocking", async () => {
    const style = document.createElement("style");
    style.dataset.probeTestStyle = "";
    style.textContent = "#ad-banner { width: 300px !important; height: 250px !important; }";
    document.head.append(style);
    const detector = createAdBlockDetector({ dom: { timeoutMs: 50 } });

    await expect(detector.detect()).resolves.toEqual({ detected: false });
    detector.dispose();
  });

  it("detects removal of a dynamically inserted bait", async () => {
    const remover = new MutationObserver(() => {
      document.getElementById("ad-banner")?.remove();
    });
    remover.observe(document.body, { childList: true, subtree: true });
    const detector = createAdBlockDetector({ dom: { timeoutMs: 50 } });

    await expect(detector.detect()).resolves.toEqual({ detected: true });
    remover.disconnect();
    detector.dispose();
  });
});
