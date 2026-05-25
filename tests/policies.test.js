import assert from "node:assert/strict";
import test from "node:test";

import { getEffectivePolicy, hostnameMatchesRule } from "../src/core/policies.js";
import { DEFAULT_SETTINGS } from "../src/core/defaults.js";

test("hostname matching works for root domain and subdomains", () => {
  assert.equal(hostnameMatchesRule("google.com", "google.com"), true);
  assert.equal(hostnameMatchesRule("www.google.com", "google.com"), true);
  assert.equal(hostnameMatchesRule("accounts.google.com", "google.com"), true);
  assert.equal(hostnameMatchesRule("notgoogle.com", "google.com"), false);
});

test("allowlist disables cleaning", () => {
  const policy = getEffectivePolicy("https://example.com/?utm_source=x", {
    ...DEFAULT_SETTINGS,
    allowlist: ["example.com"],
    sitePolicies: {}
  });

  assert.equal(policy.enabled, false);
  assert.equal(policy.mode, "disabled");
});

test("blocklist only cleans matching domains", () => {
  const matchingPolicy = getEffectivePolicy("https://example.com/?utm_source=x", {
    ...DEFAULT_SETTINGS,
    blocklist: ["example.com"],
    sitePolicies: {}
  });
  const skippedPolicy = getEffectivePolicy("https://other.com/?utm_source=x", {
    ...DEFAULT_SETTINGS,
    blocklist: ["example.com"],
    sitePolicies: {}
  });

  assert.equal(matchingPolicy.enabled, true);
  assert.equal(matchingPolicy.mode, "clean");
  assert.equal(skippedPolicy.enabled, false);
  assert.equal(skippedPolicy.mode, "disabled");
});

test("google.com default policy resolves to clean", () => {
  const policy = getEffectivePolicy("https://www.google.com/search?q=test", DEFAULT_SETTINGS);

  assert.equal(policy.enabled, true);
  assert.equal(policy.mode, "clean");
});

test("google.com with udm=50 resolves to compatibility", () => {
  const policy = getEffectivePolicy(
    "https://www.google.com/search?q=test&udm=50",
    DEFAULT_SETTINGS
  );

  assert.equal(policy.enabled, true);
  assert.equal(policy.mode, "compatibility");
});

test("disabled site policy takes precedence over compatibility params", () => {
  const policy = getEffectivePolicy("https://www.google.com/search?q=test&udm=50", {
    ...DEFAULT_SETTINGS,
    sitePolicies: {
      "google.com": {
        mode: "disabled",
        compatibilityParams: ["udm=50"]
      }
    }
  });

  assert.equal(policy.enabled, false);
  assert.equal(policy.mode, "disabled");
});

test("redirect unwrapping defaults to enabled for clean policies", () => {
  const policy = getEffectivePolicy("https://example.com/?utm_source=x", {
    ...DEFAULT_SETTINGS,
    sitePolicies: {}
  });

  assert.equal(policy.enabled, true);
  assert.equal(policy.mode, "clean");
  assert.equal(policy.redirectUnwrappingEnabled, true);
});

test("redirect unwrapping can be globally disabled", () => {
  const policy = getEffectivePolicy("https://example.com/?utm_source=x", {
    ...DEFAULT_SETTINGS,
    redirectUnwrappingEnabled: false,
    sitePolicies: {}
  });

  assert.equal(policy.enabled, true);
  assert.equal(policy.redirectUnwrappingEnabled, false);
});

test("disabled policies disable redirect unwrapping", () => {
  const policy = getEffectivePolicy("https://example.com/?utm_source=x", {
    ...DEFAULT_SETTINGS,
    sitePolicies: {
      "example.com": {
        mode: "disabled"
      }
    }
  });

  assert.equal(policy.enabled, false);
  assert.equal(policy.redirectUnwrappingEnabled, false);
});
