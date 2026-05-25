# Disable URL Tracking

Disable URL Tracking is a small Chrome/Chromium Manifest V3 extension that removes common tracking query parameters from URLs while giving users per-site policy control.

## Why it exists

Many URL cleaners work well until a stateful site depends on query parameters for navigation or session state. This MVP focuses on a compact cleaning engine plus site-specific modes, so users can keep cleaning enabled broadly while setting sensitive sites such as `google.com` to compatibility or disabled mode.

## How it differs from ClearURLs

This is not a ClearURLs fork and does not ship the ClearURLs provider catalog. The architecture is intentionally small: a reusable cleaning module, policy resolution, browser storage, popup actions, options editing, and a context menu copy action. The main differentiator is fine-grained per-site policy control.

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

## Privacy

Disable URL Tracking does not collect data, make network requests, or include analytics. Settings are stored with `chrome.storage.sync`, which means they are kept locally by the browser and may sync through the user's browser account depending on Chrome settings.

## Known Limitation

This MVP does not yet include the full ClearURLs provider catalog.

## Future Ideas

- ClearURLs-compatible rule import
- Redirect unwrapping
- History API protection
- Import/export settings
- Firefox support

