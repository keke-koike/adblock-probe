export type Detected = null | boolean;

export type DetectionSnapshot = Readonly<{
  detected: Detected;
}>;

export type DomProbeOptions = Readonly<{
  id?: string;
  classNames?: readonly string[];
  timeoutMs?: number;
}>;

export type NetworkProbeOptions = Readonly<{
  controlUrl: string;
  baitUrl: string;
  expectedText: string;
  timeoutMs?: number;
}>;

export type AdBlockDetectorOptions = Readonly<{
  dom?: false | DomProbeOptions;
  network?: NetworkProbeOptions;
}>;

export interface AdBlockDetector {
  getSnapshot: () => DetectionSnapshot;
  subscribe: (listener: () => void) => () => void;
  detect: () => Promise<DetectionSnapshot>;
  refresh: () => Promise<DetectionSnapshot>;
  dispose: () => void;
}

export type ProbeResult = Detected;

export type Probe = (signal: AbortSignal) => Promise<ProbeResult>;
