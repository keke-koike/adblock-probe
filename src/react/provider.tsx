"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { createAdBlockDetector } from "../core/detector";
import { fingerprintOptions } from "../core/options";
import type { AdBlockDetector, AdBlockDetectorOptions } from "../core/types";
import { AdBlockDetectorContext } from "./context";

type ProviderWithOptions = Readonly<{
  children: ReactNode;
  options?: AdBlockDetectorOptions;
  detector?: never;
}>;

type ProviderWithDetector = Readonly<{
  children: ReactNode;
  detector: AdBlockDetector;
  options?: never;
}>;

export type AdBlockDetectorProviderProps = ProviderWithOptions | ProviderWithDetector;

type ProviderState = Readonly<{
  detector: AdBlockDetector;
  ownsDetector: boolean;
  initialDetector: AdBlockDetector | undefined;
  initialOptionsFingerprint: string | undefined;
}>;

/**
 * Reads the bundler-provided development flag without assuming it exists.
 */
function isDevelopmentBuild(): boolean {
  const meta = import.meta as ImportMeta & { env?: { DEV?: boolean } };
  return meta.env?.DEV === true;
}

/**
 * Provides one detector for its lifetime and disposes it on unmount when created from options.
 * Changing configuration requires remounting the provider with a different React key.
 */
export function AdBlockDetectorProvider(props: AdBlockDetectorProviderProps) {
  const [state] = useState<ProviderState>(() => {
    if (props.detector !== undefined) {
      return Object.freeze({
        detector: props.detector,
        ownsDetector: false,
        initialDetector: props.detector,
        initialOptionsFingerprint: undefined,
      });
    }

    return Object.freeze({
      detector: createAdBlockDetector(props.options),
      ownsDetector: true,
      initialDetector: undefined,
      initialOptionsFingerprint: fingerprintOptions(props.options),
    });
  });
  const warnedAboutChanges = useRef(false);

  if (isDevelopmentBuild() && !warnedAboutChanges.current) {
    const detectorChanged = props.detector !== state.initialDetector;
    const optionsChanged =
      props.detector === undefined &&
      state.initialOptionsFingerprint !== fingerprintOptions(props.options);

    if (detectorChanged || optionsChanged) {
      warnedAboutChanges.current = true;
      console.warn(
        "AdBlockDetectorProvider configuration is fixed for its lifetime. " +
          "Change the Provider key to create a detector with new configuration.",
      );
    }
  }

  useEffect(
    () => () => {
      if (state.ownsDetector) {
        state.detector.dispose();
      }
    },
    [state],
  );

  return (
    <AdBlockDetectorContext.Provider value={state.detector}>
      {props.children}
    </AdBlockDetectorContext.Provider>
  );
}
