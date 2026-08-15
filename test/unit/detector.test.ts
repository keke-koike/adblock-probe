import { describe, expect, it, vi } from "vitest";

import { createAdBlockDetector, createDetectorFromProbes } from "../../src/core/detector";

describe("AdBlockDetector", () => {
  it("resolves to unknown when detection runs without a browser DOM", async () => {
    const detector = createAdBlockDetector();
    await expect(detector.detect()).resolves.toEqual({ detected: null });
  });

  it("starts unknown, notifies subscribers, and caches a completed result", async () => {
    const probe = vi.fn(async () => false);
    const detector = createDetectorFromProbes([probe]);
    const listener = vi.fn();
    detector.subscribe(listener);

    const initialSnapshot = detector.getSnapshot();
    expect(initialSnapshot).toEqual({ detected: null });
    expect(detector.getSnapshot()).toBe(initialSnapshot);

    await expect(detector.detect()).resolves.toEqual({ detected: false });
    expect(probe).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledOnce();

    const completedSnapshot = detector.getSnapshot();
    await expect(detector.detect()).resolves.toBe(completedSnapshot);
    expect(probe).toHaveBeenCalledOnce();
  });

  it("shares concurrent detection and does not overlap refresh", async () => {
    let resolveProbe: ((value: false) => void) | undefined;
    const probe = vi.fn(
      () =>
        new Promise<false>((resolve) => {
          resolveProbe = resolve;
        }),
    );
    const detector = createDetectorFromProbes([probe]);

    const first = detector.detect();
    const second = detector.detect();
    const refresh = detector.refresh();
    expect(second).toBe(first);
    expect(refresh).toBe(first);

    await Promise.resolve();
    resolveProbe?.(false);
    await expect(first).resolves.toEqual({ detected: false });
    expect(probe).toHaveBeenCalledOnce();
  });

  it("returns to unknown while refreshing", async () => {
    const results = [false, true];
    const detector = createDetectorFromProbes([async () => results.shift() ?? null]);
    const listener = vi.fn();
    detector.subscribe(listener);

    await detector.detect();
    const refresh = detector.refresh();
    expect(detector.getSnapshot()).toEqual({ detected: null });
    await expect(refresh).resolves.toEqual({ detected: true });
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("aborts active work and rejects new work after disposal", async () => {
    const probe = vi.fn(
      (signal: AbortSignal) =>
        new Promise<null>((resolve) => {
          signal.addEventListener("abort", () => resolve(null), { once: true });
        }),
    );
    const detector = createDetectorFromProbes([probe]);
    const pending = detector.detect();

    detector.dispose();
    await expect(pending).resolves.toEqual({ detected: null });
    expect(() => detector.detect()).toThrow("disposed");
    expect(() => detector.refresh()).toThrow("disposed");
    expect(() => detector.subscribe(() => undefined)).toThrow("disposed");
  });
});
