import { describe, expect, it, vi } from "vitest";

import { aggregateProbeResults, evaluateProbes } from "../../src/core/aggregate";

describe("aggregateProbeResults", () => {
  it.each([
    [[true, false], true],
    [[true, null], true],
    [[false, null], null],
    [[false, false], false],
  ] as const)("aggregates %j to %j", (results, expected) => {
    expect(aggregateProbeResults(results)).toBe(expected);
  });
});

describe("evaluateProbes", () => {
  it("settles early on a positive result and aborts remaining probes", async () => {
    const slowProbe = vi.fn(
      (signal: AbortSignal) =>
        new Promise<null>((resolve) => {
          signal.addEventListener("abort", () => resolve(null), { once: true });
        }),
    );
    const controller = new AbortController();

    await expect(evaluateProbes([slowProbe, async () => true], controller)).resolves.toBe(true);
    expect(controller.signal.aborted).toBe(true);
    expect(slowProbe).toHaveBeenCalledOnce();
  });

  it("maps probe exceptions to an indeterminate result", async () => {
    const controller = new AbortController();
    await expect(
      evaluateProbes(
        [
          async () => {
            throw new Error("probe failed");
          },
          async () => false,
        ],
        controller,
      ),
    ).resolves.toBe(null);
  });
});
