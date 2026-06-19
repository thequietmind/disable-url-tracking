import assert from "node:assert/strict";
import test from "node:test";

import { testExports } from "../src/core/settings.js";

const { mergeSettings } = testExports;

test("settings migrate old google compatibility default", () => {
  const settings = mergeSettings({
    globalEnabled: true,
    defaultMode: "clean",
    allowlist: [],
    blocklist: [],
    sitePolicies: {
      "google.com": {
        mode: "compatibility"
      }
    }
  });

  assert.deepEqual(settings.sitePolicies["google.com"], {
    mode: "clean",
    compatibilityParams: ["udm=50"]
  });
});

test("settings preserve customized google compatibility policy", () => {
  const settings = mergeSettings({
    globalEnabled: true,
    defaultMode: "clean",
    sitePolicies: {
      "google.com": {
        mode: "compatibility",
        preserveParams: ["utm_source"]
      }
    }
  });

  assert.deepEqual(settings.sitePolicies["google.com"], {
    mode: "compatibility",
    preserveParams: ["utm_source"]
  });
});

