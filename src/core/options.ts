import type { AdBlockDetectorOptions, DomProbeOptions, NetworkProbeOptions } from "./types";

export const DEFAULT_DOM_ID = "ad-banner";
export const DEFAULT_DOM_CLASS_NAMES = Object.freeze([
  "adsbox",
  "ad-banner",
  "ad-container",
  "advertisement",
]);
export const DEFAULT_DOM_TIMEOUT_MS = 100;
export const DEFAULT_NETWORK_TIMEOUT_MS = 3_000;

export type NormalizedDomProbeOptions = Readonly<{
  id: string;
  classNames: readonly string[];
  timeoutMs: number;
}>;

export type NormalizedNetworkProbeOptions = Readonly<{
  controlUrl: string;
  baitUrl: string;
  expectedText: string;
  timeoutMs: number;
}>;

export type NormalizedDetectorOptions = Readonly<{
  dom: false | NormalizedDomProbeOptions;
  network?: NormalizedNetworkProbeOptions;
}>;

/**
 * Applies the default timeout and rejects values that cannot represent a usable duration.
 */
function normalizeTimeout(value: number | undefined, fallback: number, label: string): number {
  const timeout = value ?? fallback;

  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new TypeError(`${label} must be a positive finite number.`);
  }

  return timeout;
}

/**
 * Validates DOM probe options and returns an immutable, fully populated representation.
 */
function normalizeDomOptions(options: DomProbeOptions | undefined): NormalizedDomProbeOptions {
  const id = options?.id ?? DEFAULT_DOM_ID;
  const classNames = [...new Set(options?.classNames ?? DEFAULT_DOM_CLASS_NAMES)];

  if (id !== id.trim()) {
    throw new TypeError("dom.id must not have leading or trailing whitespace.");
  }

  for (const className of classNames) {
    if (className.length === 0 || /\s/u.test(className)) {
      throw new TypeError("Every dom.classNames entry must be a non-empty DOM token.");
    }
  }

  if (id.length === 0 && classNames.length === 0) {
    throw new TypeError("The DOM probe requires at least one bait id or class name.");
  }

  return Object.freeze({
    id,
    classNames: Object.freeze(classNames),
    timeoutMs: normalizeTimeout(options?.timeoutMs, DEFAULT_DOM_TIMEOUT_MS, "dom.timeoutMs"),
  });
}

/**
 * Restricts probe resources to root-relative URLs without fragments.
 */
function assertRootRelativeUrl(value: string, label: string): void {
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value.includes("#")
  ) {
    throw new TypeError(`${label} must be a root-relative URL without a fragment.`);
  }
}

/**
 * Validates network probe options and returns an immutable, fully populated representation.
 */
function normalizeNetworkOptions(options: NetworkProbeOptions): NormalizedNetworkProbeOptions {
  assertRootRelativeUrl(options.controlUrl, "network.controlUrl");
  assertRootRelativeUrl(options.baitUrl, "network.baitUrl");

  if (options.controlUrl === options.baitUrl) {
    throw new TypeError("network.controlUrl and network.baitUrl must be different URLs.");
  }

  if (options.expectedText.length === 0) {
    throw new TypeError("network.expectedText must not be empty.");
  }

  return Object.freeze({
    controlUrl: options.controlUrl,
    baitUrl: options.baitUrl,
    expectedText: options.expectedText,
    timeoutMs: normalizeTimeout(options.timeoutMs, DEFAULT_NETWORK_TIMEOUT_MS, "network.timeoutMs"),
  });
}

/**
 * Validates detector options and resolves all defaults into an immutable representation.
 */
export function normalizeOptions(options: AdBlockDetectorOptions = {}): NormalizedDetectorOptions {
  const dom = options.dom === false ? false : normalizeDomOptions(options.dom);
  const network =
    options.network === undefined ? undefined : normalizeNetworkOptions(options.network);

  if (dom === false && network === undefined) {
    throw new TypeError("At least one probe must be enabled.");
  }

  return Object.freeze(network === undefined ? { dom } : { dom, network });
}

/**
 * Produces a stable value used to detect effective option changes across React renders.
 */
export function fingerprintOptions(options: AdBlockDetectorOptions | undefined): string {
  return JSON.stringify(normalizeOptions(options));
}
