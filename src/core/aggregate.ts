import type { Probe, ProbeResult } from "./types";

export function aggregateProbeResults(results: readonly ProbeResult[]): ProbeResult {
  if (results.some((result) => result === true)) {
    return true;
  }

  if (results.some((result) => result === null)) {
    return null;
  }

  return false;
}

export function runAndAggregateProbes(
  probes: readonly Probe[],
  controller: AbortController,
): Promise<ProbeResult> {
  return new Promise((resolve) => {
    let settled = false;
    let completed = 0;
    const results: ProbeResult[] = [];

    const settle = (result: ProbeResult, abortRemaining: boolean): void => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(result);

      if (abortRemaining) {
        controller.abort();
      }
    };

    controller.signal.addEventListener("abort", () => settle(null, false), { once: true });

    for (const probe of probes) {
      Promise.resolve()
        .then(() => probe(controller.signal))
        .catch(() => null)
        .then((result) => {
          if (settled) {
            return;
          }

          results.push(result);
          completed += 1;

          if (result === true) {
            settle(true, true);
            return;
          }

          if (completed === probes.length) {
            settle(aggregateProbeResults(results), false);
          }
        });
    }
  });
}
