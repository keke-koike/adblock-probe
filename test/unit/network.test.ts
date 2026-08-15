import { describe, expect, it, vi } from "vitest";

import type { DetectorEnvironment } from "../../src/core/environment";
import { normalizeOptions } from "../../src/core/options";
import { runNetworkProbe } from "../../src/core/probes/network";

const networkOptions = normalizeOptions({
  dom: false,
  network: {
    controlUrl: "/probe/control.txt",
    baitUrl: "/ads/bait.txt",
    expectedText: "probe-ok",
    timeoutMs: 50,
  },
}).network!;

function createEnvironment(
  responses: Readonly<Record<string, Response | Error>>,
): DetectorEnvironment {
  return {
    getDocument: () => ({}) as Document,
    fetch: vi.fn(async (url: string) => {
      const result = responses[url];
      if (result === undefined || result instanceof Error) {
        throw result ?? new Error("missing response");
      }
      return result;
    }),
  };
}

describe("runNetworkProbe", () => {
  it.each([
    [new Response("probe-ok"), new Response("probe-ok"), false],
    [new Response("probe-ok"), new Response("nope"), true],
    [new Response("probe-ok"), new Response("probe-ok", { status: 404 }), true],
    [new Error("offline"), new Error("offline"), null],
    [new Error("control failed"), new Response("probe-ok"), null],
  ] as const)("applies the paired request truth table %#", async (control, bait, expected) => {
    const environment = createEnvironment({
      "/probe/control.txt": control,
      "/ads/bait.txt": bait,
    });

    await expect(
      runNetworkProbe(networkOptions, environment, new AbortController().signal),
    ).resolves.toBe(expected);
  });

  it("does not fetch during SSR", async () => {
    const fetch = vi.fn<DetectorEnvironment["fetch"]>();
    const environment: DetectorEnvironment = {
      getDocument: () => undefined,
      fetch,
    };

    await expect(
      runNetworkProbe(networkOptions, environment, new AbortController().signal),
    ).resolves.toBe(null);
    expect(fetch).not.toHaveBeenCalled();
  });
});
