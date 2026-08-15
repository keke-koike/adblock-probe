import { describe, expect, it } from "vitest";

import {
  DEFAULT_DOM_CLASS_NAMES,
  DEFAULT_DOM_ID,
  DEFAULT_DOM_TIMEOUT_MS,
  DEFAULT_NETWORK_TIMEOUT_MS,
  normalizeOptions,
} from "../../src/core/options";

describe("normalizeOptions", () => {
  it("enables the default DOM probe", () => {
    expect(normalizeOptions()).toEqual({
      dom: {
        id: DEFAULT_DOM_ID,
        classNames: DEFAULT_DOM_CLASS_NAMES,
        timeoutMs: DEFAULT_DOM_TIMEOUT_MS,
      },
    });
  });

  it("replaces configured DOM identifiers while retaining omitted defaults", () => {
    expect(normalizeOptions({ dom: { classNames: ["sponsor-slot", "sponsor-slot"] } })).toEqual({
      dom: {
        id: DEFAULT_DOM_ID,
        classNames: ["sponsor-slot"],
        timeoutMs: DEFAULT_DOM_TIMEOUT_MS,
      },
    });
  });

  it("normalizes a root-relative network probe", () => {
    expect(
      normalizeOptions({
        dom: false,
        network: {
          controlUrl: "/probe/control.txt",
          baitUrl: "/ads/advertisement.txt?probe=1",
          expectedText: "probe-ok",
        },
      }),
    ).toEqual({
      dom: false,
      network: {
        controlUrl: "/probe/control.txt",
        baitUrl: "/ads/advertisement.txt?probe=1",
        expectedText: "probe-ok",
        timeoutMs: DEFAULT_NETWORK_TIMEOUT_MS,
      },
    });
  });

  it.each([
    [{ dom: false }, "At least one probe"],
    [{ dom: { id: "", classNames: [] } }, "at least one bait"],
    [{ dom: { classNames: ["two tokens"] } }, "DOM token"],
    [{ dom: { timeoutMs: 0 } }, "positive finite"],
    [
      {
        network: {
          controlUrl: "https://example.com/control.txt",
          baitUrl: "/ads/bait.txt",
          expectedText: "ok",
        },
      },
      "root-relative",
    ],
    [
      {
        network: {
          controlUrl: "//example.com/control.txt",
          baitUrl: "/ads/bait.txt",
          expectedText: "ok",
        },
      },
      "root-relative",
    ],
    [
      {
        network: {
          controlUrl: "/same.txt",
          baitUrl: "/same.txt",
          expectedText: "ok",
        },
      },
      "different URLs",
    ],
  ] as const)("rejects invalid configuration %#", (options, message) => {
    expect(() => normalizeOptions(options)).toThrow(message);
  });
});
