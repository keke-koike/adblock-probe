import type { DetectorEnvironment } from "../environment";
import type { NormalizedNetworkProbeOptions } from "../options";
import type { ProbeResult } from "../types";

/**
 * Fetches a probe resource and verifies its exact payload within the configured timeout.
 */
async function requestMatches(
  url: string,
  expectedText: string,
  timeoutMs: number,
  environment: DetectorEnvironment,
  parentSignal: AbortSignal,
): Promise<boolean> {
  const controller = new AbortController();
  const abort = (): void => controller.abort();
  const timer = setTimeout(abort, timeoutMs);
  parentSignal.addEventListener("abort", abort, { once: true });

  if (parentSignal.aborted) {
    controller.abort();
  }

  try {
    const response = await environment.fetch(url, {
      method: "GET",
      cache: "no-store",
      credentials: "omit",
      signal: controller.signal,
    });

    return response.ok && (await response.text()) === expectedText;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
    parentSignal.removeEventListener("abort", abort);
  }
}

/**
 * Compares an ordinary control request with an ad-like bait request.
 * A failed control is indeterminate; only a successful control paired with a failed bait indicates
 * blocking.
 */
export async function runNetworkProbe(
  options: NormalizedNetworkProbeOptions,
  environment: DetectorEnvironment,
  signal: AbortSignal,
): Promise<ProbeResult> {
  if (environment.getDocument() === undefined || signal.aborted) {
    return null;
  }

  const [controlSucceeded, baitSucceeded] = await Promise.all([
    requestMatches(
      options.controlUrl,
      options.expectedText,
      options.timeoutMs,
      environment,
      signal,
    ),
    requestMatches(options.baitUrl, options.expectedText, options.timeoutMs, environment, signal),
  ]);

  if (signal.aborted) {
    return null;
  }

  if (!controlSucceeded) {
    return null;
  }

  return baitSucceeded ? false : true;
}
