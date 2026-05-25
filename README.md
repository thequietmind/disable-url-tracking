# Disable URL Tracking

Disable URL Tracking is a small Chrome/Chromium Manifest V3 extension that removes common tracking query parameters from URLs while giving users per-site policy control. In clean mode, it automatically cleans tab URLs after navigation starts; compatibility mode skips automatic rewrites but keeps manual cleaning available. It can also unwrap a small set of common safe redirect URLs when redirect unwrapping is enabled.

## Why it exists

Many URL cleaners work well until a stateful site depends on query parameters for navigation or session state. This MVP focuses on a compact cleaning engine plus site-specific modes, so users can keep cleaning enabled broadly while setting sensitive URLs such as Google AI Mode (`udm=50`) to compatibility.

## How it differs from ClearURLs

This is not a ClearURLs fork and does not ship the ClearURLs provider catalog. The architecture is intentionally small: a reusable cleaning module, policy resolution, browser storage, automatic tab URL cleaning, safe redirect unwrapping, popup actions, options editing, and a context menu copy action. The main differentiator is fine-grained per-site policy control.

## Load unpacked in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project directory.
5. Open the extension popup from the toolbar.

## Development

Run the lightweight Node test suite:

```sh
npm test
```

No build step is required.

## Manual Testing

Use a Google redirect wrapper to test automatic redirect unwrapping. The default Google policy is clean except when the URL contains `udm=50`:

```text
https://www.google.com/url?q=https%3A%2F%2Fexample.com%2Fpage%3Futm_source%3Dnews%26fbclid%3D123%26foo%3Dbar%23section
```

Expected result:

```text
https://example.com/page?foo=bar#section
```

To verify the Google AI Mode escape hatch, open a Google URL containing `udm=50`; it should not be automatically rewritten.

## Privacy

Disable URL Tracking does not collect data, make network requests, or include analytics. Settings are stored with `chrome.storage.sync`, which means they are kept locally by the browser and may sync through the user's browser account depending on Chrome settings.

## Known Limitation

This MVP does not yet include the full ClearURLs provider catalog, full-domain blocking, force redirection behavior, remote rule downloads, history API interception, or request-time declarativeNetRequest rewriting. Automatic cleaning happens at the tab URL level after navigation starts.

## Future Ideas

- ClearURLs-compatible rule import
- More redirect unwrap patterns
- History API protection
- Import/export settings
- Firefox support
