import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "vitest-browser-react";

import type { AdBlockDetector, DetectionSnapshot } from "../../src/index";
import { AdBlockDetectorProvider, useAdBlockDetector } from "../../src/react";

function createFakeDetector(initial: null | boolean = null) {
  const listeners = new Set<() => void>();
  let snapshot: DetectionSnapshot = Object.freeze({ detected: initial });
  const detect = vi.fn(async () => snapshot);
  const dispose = vi.fn();
  const detector: AdBlockDetector = {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    detect,
    refresh: detect,
    dispose,
  };

  return {
    detector,
    detect,
    dispose,
    setDetected(detected: null | boolean) {
      snapshot = Object.freeze({ detected });
      listeners.forEach((listener) => listener());
    },
  };
}

function Consumer({ label }: { label: string }) {
  const { detected } = useAdBlockDetector();
  return <output aria-label={label}>{detected === null ? "unknown" : String(detected)}</output>;
}

describe("React adapter", () => {
  it("subscribes to an injected detector and starts detection after mount", async () => {
    const fake = createFakeDetector();
    const screen = await render(
      <StrictMode>
        <AdBlockDetectorProvider detector={fake.detector}>
          <Consumer label="status" />
        </AdBlockDetectorProvider>
      </StrictMode>,
    );

    await expect.element(screen.getByLabelText("status")).toHaveTextContent("unknown");
    expect(fake.detect).toHaveBeenCalled();

    fake.setDetected(true);
    await expect.element(screen.getByLabelText("status")).toHaveTextContent("true");

    await screen.unmount();
    expect(fake.dispose).not.toHaveBeenCalled();
  });

  it("uses the closest Provider and isolates nested detector state", async () => {
    const outer = createFakeDetector(false);
    const inner = createFakeDetector(true);
    const screen = await render(
      <AdBlockDetectorProvider detector={outer.detector}>
        <Consumer label="outer" />
        <AdBlockDetectorProvider detector={inner.detector}>
          <Consumer label="inner" />
        </AdBlockDetectorProvider>
      </AdBlockDetectorProvider>,
    );

    await expect.element(screen.getByLabelText("outer")).toHaveTextContent("false");
    await expect.element(screen.getByLabelText("inner")).toHaveTextContent("true");
  });

  it("disposes an internally owned detector on unmount", async () => {
    const screen = await render(
      <AdBlockDetectorProvider options={{ dom: { timeoutMs: 10_000 } }}>
        <Consumer label="owned" />
      </AdBlockDetectorProvider>,
    );

    await vi.waitFor(() => {
      expect(document.getElementById("ad-banner")).not.toBeNull();
    });
    await screen.unmount();
    expect(document.getElementById("ad-banner")).toBeNull();
  });
});
