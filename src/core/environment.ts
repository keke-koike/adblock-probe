export type DetectorEnvironment = Readonly<{
  getDocument: () => Document | undefined;
  fetch: (input: string, init: RequestInit) => Promise<Response>;
}>;

export const browserEnvironment: DetectorEnvironment = Object.freeze({
  getDocument: () => (typeof document === "undefined" ? undefined : document),
  fetch: (input, init) => {
    if (typeof globalThis.fetch !== "function") {
      return Promise.reject(new TypeError("fetch is not available in this environment."));
    }

    return globalThis.fetch(input, init);
  },
});
