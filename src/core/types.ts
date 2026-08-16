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
  /**
   * Returns the current immutable detection snapshot.
   */
  getSnapshot: () => DetectionSnapshot;
  /**
   * Subscribes to snapshot changes and returns an unsubscribe function.
   */
  subscribe: (listener: () => void) => () => void;
  /**
   * Runs detection once and reuses the completed result on later calls.
   */
  detect: () => Promise<DetectionSnapshot>;
  /**
   * Runs detection again, sharing any evaluation that is already in progress.
   */
  refresh: () => Promise<DetectionSnapshot>;
  /**
   * Cancels active work and permanently releases this detector's listeners.
   */
  dispose: () => void;
}

export type ProbeResult = Detected;

export type Probe = (signal: AbortSignal) => Promise<ProbeResult>;
