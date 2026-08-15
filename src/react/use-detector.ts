"use client";

import { useContext, useEffect, useSyncExternalStore } from "react";

import { createAdBlockDetector } from "../core/detector";
import type { AdBlockDetector, DetectionSnapshot } from "../core/types";
import { AdBlockDetectorContext } from "./context";

const SERVER_SNAPSHOT: DetectionSnapshot = Object.freeze({ detected: null });
let defaultDetector: AdBlockDetector | undefined;

function getDefaultDetector(): AdBlockDetector {
  defaultDetector ??= createAdBlockDetector();
  return defaultDetector;
}

export type UseAdBlockDetectorResult = DetectionSnapshot;

export function useAdBlockDetector(): UseAdBlockDetectorResult {
  const contextDetector = useContext(AdBlockDetectorContext);
  const detector = contextDetector ?? getDefaultDetector();
  const snapshot = useSyncExternalStore(
    detector.subscribe,
    detector.getSnapshot,
    () => SERVER_SNAPSHOT,
  );

  useEffect(() => {
    void detector.detect().catch(() => {
      // A detector can only reject here if its owner disposed it between render and effect.
    });
  }, [detector]);

  return snapshot;
}
