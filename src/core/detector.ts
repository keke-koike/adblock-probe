import { evaluateProbes } from "./aggregate";
import { browserEnvironment, type DetectorEnvironment } from "./environment";
import { normalizeOptions } from "./options";
import { runDomProbe } from "./probes/dom";
import { runNetworkProbe } from "./probes/network";
import type {
  AdBlockDetector,
  AdBlockDetectorOptions,
  Detected,
  DetectionSnapshot,
  Probe,
} from "./types";

const NULL_SNAPSHOT: DetectionSnapshot = Object.freeze({ detected: null });

function createSnapshot(detected: Detected): DetectionSnapshot {
  return detected === null ? NULL_SNAPSHOT : Object.freeze({ detected });
}

export function createDetectorFromProbes(probes: readonly Probe[]): AdBlockDetector {
  if (probes.length === 0) {
    throw new TypeError("At least one probe must be enabled.");
  }

  const listeners = new Set<() => void>();
  let snapshot = NULL_SNAPSHOT;
  let completed = false;
  let disposed = false;
  let generation = 0;
  let currentController: AbortController | undefined;
  let currentPromise: Promise<DetectionSnapshot> | undefined;

  const assertActive = (): void => {
    if (disposed) {
      throw new Error("This ad block detector has been disposed.");
    }
  };

  const setDetected = (detected: Detected): void => {
    if (snapshot.detected === detected) {
      return;
    }

    snapshot = createSnapshot(detected);
    for (const listener of listeners) {
      listener();
    }
  };

  const start = (force: boolean): Promise<DetectionSnapshot> => {
    assertActive();

    if (currentPromise !== undefined) {
      return currentPromise;
    }

    if (!force && completed) {
      return Promise.resolve(snapshot);
    }

    setDetected(null);
    const runGeneration = ++generation;
    const controller = new AbortController();
    currentController = controller;

    const promise = evaluateProbes(probes, controller)
      .then((detected) => {
        if (!disposed && generation === runGeneration) {
          completed = true;
          setDetected(detected);
        }

        return snapshot;
      })
      .finally(() => {
        if (generation === runGeneration) {
          currentController = undefined;
          currentPromise = undefined;
        }
      });

    currentPromise = promise;
    return promise;
  };

  return Object.freeze({
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      assertActive();
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    detect: () => start(false),
    refresh: () => start(true),
    dispose: () => {
      if (disposed) {
        return;
      }

      disposed = true;
      generation += 1;
      currentController?.abort();
      currentController = undefined;
      currentPromise = undefined;
      listeners.clear();
    },
  });
}

export function createAdBlockDetectorInternal(
  options: AdBlockDetectorOptions = {},
  environment: DetectorEnvironment = browserEnvironment,
): AdBlockDetector {
  const normalized = normalizeOptions(options);
  const probes: Probe[] = [];

  if (normalized.dom !== false) {
    const domOptions = normalized.dom;
    probes.push((signal) => runDomProbe(domOptions, environment, signal));
  }

  if (normalized.network !== undefined) {
    const networkOptions = normalized.network;
    probes.push((signal) => runNetworkProbe(networkOptions, environment, signal));
  }

  return createDetectorFromProbes(probes);
}

export function createAdBlockDetector(options: AdBlockDetectorOptions = {}): AdBlockDetector {
  return createAdBlockDetectorInternal(options);
}
