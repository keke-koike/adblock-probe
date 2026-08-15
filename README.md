# adblock-probe

Minimal, framework-agnostic detection of ad blocking behavior in modern browsers.

`adblock-probe` observes whether an ad-like DOM element or an optional same-origin probe resource is blocked. It does not identify installed browser extensions.

## Install

```sh
pnpm add adblock-probe
```

## Vanilla

```ts
import { createAdBlockDetector } from "adblock-probe";

const detector = createAdBlockDetector();

detector.subscribe(() => {
  console.log(detector.getSnapshot());
});

await detector.detect();
```

The snapshot has one field:

```ts
type DetectionSnapshot = Readonly<{
  detected: null | boolean;
}>;
```

- `null`: detection has not run, is running, or could not reach a reliable conclusion.
- `true`: at least one enabled probe observed blocking behavior.
- `false`: every enabled probe completed without observing blocking behavior.

`detect()` runs once and caches its result. `refresh()` starts a new run and returns the snapshot to `null` while it is running. `dispose()` aborts active work and releases subscribers.

## React

React 18 and 19 are supported through the optional `adblock-probe/react` entry.

```tsx
import { useAdBlockDetector } from "adblock-probe/react";

function AdBlockNotice() {
  const { detected } = useAdBlockDetector();

  if (detected !== true) return null;
  return <p>Ads appear to be blocked.</p>;
}
```

Without a Provider, hooks share one lazily created DOM-only detector for the lifetime of the page.

Use a Provider to configure or isolate a detector:

```tsx
import { AdBlockDetectorProvider } from "adblock-probe/react";

const options = {
  network: {
    controlUrl: "/adblock-probe/control.txt",
    baitUrl: "/ads/advertisement.txt",
    expectedText: "probe-ok",
  },
};

<AdBlockDetectorProvider options={options}>
  <App />
</AdBlockDetectorProvider>;
```

Provider options are fixed for the Provider lifetime. Change its React `key` to apply new options. You can also pass a detector created by `createAdBlockDetector`; an injected detector remains owned by the caller and is not disposed by the Provider.

The React entry is a Client Component boundary. Importing either entry is SSR-safe, and the server snapshot is always `{ detected: null }`.

## DOM probe

The zero-config DOM probe inserts one neutral control and one off-screen 1×1px bait. It observes removal, computed `display` and `visibility`, and layout dimensions for a short bounded window, then removes both elements.

Default bait identifiers:

```text
id: ad-banner
classes: adsbox ad-banner ad-container advertisement
```

Override an individual setting when a site needs different bait identifiers:

```ts
createAdBlockDetector({
  dom: {
    id: "sponsor-slot",
    classNames: ["sponsored-content"],
    timeoutMs: 150,
  },
});
```

Configured `id` and `classNames` replace their corresponding defaults. Use `dom: false` only when another probe is enabled.

## Optional network probe

The network probe performs two parallel GET requests:

1. A neutral control path.
2. An ad-like bait path.

Both files should be public, static, and return the exact same text. Only root-relative URLs are accepted. Requests use `cache: "no-store"` and `credentials: "omit"`; the library never contacts a service of its own.

| Control  | Bait              | Result  |
| -------- | ----------------- | ------- |
| succeeds | succeeds          | `false` |
| succeeds | fails             | `true`  |
| fails    | succeeds or fails | `null`  |

An HTTP error status or unexpected response body counts as a failed request.

## Limitations

- The result describes observed blocking behavior, not whether a specific extension is installed.
- `false` does not prove that an ad blocker is absent. Allow lists, filter settings, and browser differences can produce false negatives.
- Page CSS, CSP, network failures, service workers, and changing filter lists can affect detection and produce false positives or indeterminate results.
- Client-side detection can be bypassed by sufficiently capable content blockers.
- Do not use this result for access control, security decisions, or punitive behavior toward privacy tools.
- The package performs no telemetry and sends no detection result anywhere.

## Development

The project uses pnpm 11 and delays dependency versions until they have been published for seven days:

```yaml
minimumReleaseAge: 10080
```

```sh
pnpm install
pnpm check
pnpm pack:check
```

Browser tests use Playwright with Chromium, Firefox, and WebKit. Install the managed browsers once with `pnpm exec playwright install`.

## License

MIT
