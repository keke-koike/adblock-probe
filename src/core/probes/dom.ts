import type { DetectorEnvironment } from "../environment";
import type { NormalizedDomProbeOptions } from "../options";
import type { ProbeResult } from "../types";

function waitForBody(document: Document, signal: AbortSignal): Promise<HTMLElement | null> {
  if (document.body !== null) {
    return Promise.resolve(document.body);
  }

  return new Promise((resolve) => {
    const finish = (): void => {
      document.removeEventListener("DOMContentLoaded", onReady);
      signal.removeEventListener("abort", onAbort);
      resolve(document.body);
    };
    const onReady = (): void => finish();
    const onAbort = (): void => finish();

    document.addEventListener("DOMContentLoaded", onReady, { once: true });
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function waitForVisibility(document: Document, signal: AbortSignal): Promise<boolean> {
  if (document.visibilityState === "visible") {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const finish = (visible: boolean): void => {
      document.removeEventListener("visibilitychange", onChange);
      signal.removeEventListener("abort", onAbort);
      resolve(visible);
    };
    const onChange = (): void => {
      if (document.visibilityState === "visible") {
        finish(true);
      }
    };
    const onAbort = (): void => finish(false);

    document.addEventListener("visibilitychange", onChange);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function waitForFrame(document: Document, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    const view = document.defaultView;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame: number | undefined;

    const finish = (completed: boolean): void => {
      signal.removeEventListener("abort", onAbort);
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      if (frame !== undefined && view !== null) {
        view.cancelAnimationFrame(frame);
      }
      resolve(completed);
    };
    const onAbort = (): void => finish(false);

    signal.addEventListener("abort", onAbort, { once: true });

    if (view !== null && typeof view.requestAnimationFrame === "function") {
      frame = view.requestAnimationFrame(() => finish(true));
    } else {
      timer = setTimeout(() => finish(true), 16);
    }
  });
}

function waitForDuration(durationMs: number, signal: AbortSignal): Promise<boolean> {
  if (durationMs <= 0) {
    return Promise.resolve(!signal.aborted);
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => finish(true), durationMs);
    const finish = (completed: boolean): void => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      resolve(completed);
    };
    const onAbort = (): void => finish(false);

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function styleProbeElement(element: HTMLElement): void {
  element.style.position = "absolute";
  element.style.left = "-10000px";
  element.style.top = "0";
  element.style.width = "1px";
  element.style.height = "1px";
  element.style.pointerEvents = "none";
}

function readProbeResult(document: Document, control: HTMLElement, bait: HTMLElement): ProbeResult {
  const view = document.defaultView;
  if (view === null || !control.isConnected) {
    return null;
  }

  try {
    const controlStyle = view.getComputedStyle(control);
    const controlRect = control.getBoundingClientRect();
    const controlIsUsable =
      controlStyle.display !== "none" &&
      controlStyle.visibility !== "hidden" &&
      controlStyle.visibility !== "collapse" &&
      controlRect.width > 0 &&
      controlRect.height > 0;

    if (!controlIsUsable) {
      return null;
    }

    if (!bait.isConnected) {
      return true;
    }

    const baitStyle = view.getComputedStyle(bait);
    const baitRect = bait.getBoundingClientRect();
    if (
      baitStyle.display === "none" ||
      baitStyle.visibility === "hidden" ||
      baitStyle.visibility === "collapse" ||
      baitRect.width <= 0 ||
      baitRect.height <= 0
    ) {
      return true;
    }

    const dimensionChanged =
      Math.abs(baitRect.width - controlRect.width) > 0.5 ||
      Math.abs(baitRect.height - controlRect.height) > 0.5;
    return dimensionChanged ? true : false;
  } catch {
    return null;
  }
}

export async function runDomProbe(
  options: NormalizedDomProbeOptions,
  environment: DetectorEnvironment,
  signal: AbortSignal,
): Promise<ProbeResult> {
  const document = environment.getDocument();
  if (document === undefined || signal.aborted) {
    return null;
  }

  const body = await waitForBody(document, signal);
  if (body === null || signal.aborted || !(await waitForVisibility(document, signal))) {
    return null;
  }

  const control = document.createElement("div");
  const bait = document.createElement("div");
  control.setAttribute("aria-hidden", "true");
  bait.setAttribute("aria-hidden", "true");
  styleProbeElement(control);
  styleProbeElement(bait);

  if (options.id.length > 0) {
    bait.id = options.id;
  }
  bait.classList.add(...options.classNames);

  let baitWasRemoved = false;
  const MutationObserverConstructor = document.defaultView?.MutationObserver;
  const observer =
    MutationObserverConstructor === undefined
      ? undefined
      : new MutationObserverConstructor(() => {
          if (!bait.isConnected) {
            baitWasRemoved = true;
          }
        });

  const startedAt = Date.now();
  body.append(control, bait);
  observer?.observe(body, { childList: true, subtree: true });

  try {
    if (!(await waitForFrame(document, signal)) || !(await waitForFrame(document, signal))) {
      return null;
    }

    const firstResult = baitWasRemoved ? true : readProbeResult(document, control, bait);
    if (firstResult === true || firstResult === null) {
      return firstResult;
    }

    const remainingMs = Math.max(0, options.timeoutMs - (Date.now() - startedAt));
    if (!(await waitForDuration(remainingMs, signal))) {
      return null;
    }

    return baitWasRemoved ? true : readProbeResult(document, control, bait);
  } finally {
    observer?.disconnect();
    control.remove();
    bait.remove();
  }
}
