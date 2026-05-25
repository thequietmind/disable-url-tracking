import assert from "node:assert/strict";
import test from "node:test";

import { cleanUrl } from "../src/core/cleaner.js";

test("cleaner removes utm params", () => {
  const result = cleanUrl("https://example.com/?utm_source=news&utm_medium=email");

  assert.equal(result.cleanedUrl, "https://example.com/");
  assert.equal(result.changed, true);
  assert.deepEqual(result.removedParams.sort(), ["utm_medium", "utm_source"]);
});

test("cleaner removes fbclid and gclid", () => {
  const result = cleanUrl("https://example.com/?fbclid=one&gclid=two&keep=yes");

  assert.equal(result.cleanedUrl, "https://example.com/?keep=yes");
  assert.deepEqual(result.removedParams.sort(), ["fbclid", "gclid"]);
});

test("cleaner preserves regular params", () => {
  const result = cleanUrl("https://example.com/search?q=test&page=2");

  assert.equal(result.cleanedUrl, "https://example.com/search?q=test&page=2");
  assert.equal(result.changed, false);
});

test("cleaner preserves hash fragments", () => {
  const result = cleanUrl("https://example.com/page?utm_source=x&foo=bar#section");

  assert.equal(result.cleanedUrl, "https://example.com/page?foo=bar#section");
});

test("cleaner handles invalid URLs", () => {
  const result = cleanUrl("not a valid url");

  assert.equal(result.cleanedUrl, "not a valid url");
  assert.equal(result.changed, false);
  assert.equal(result.reason, "Invalid URL");
});

test("preserveParams prevents removal", () => {
  const result = cleanUrl("https://example.com/?utm_source=news&foo=bar", {
    preserveParams: ["utm_source"]
  });

  assert.equal(result.cleanedUrl, "https://example.com/?utm_source=news&foo=bar");
  assert.equal(result.changed, false);
  assert.deepEqual(result.preservedParams, ["utm_source"]);
});

test("removeParams allows custom param removal", () => {
  const result = cleanUrl("https://example.com/?foo=bar&session_id=abc", {
    removeParams: ["session_*"]
  });

  assert.equal(result.cleanedUrl, "https://example.com/?foo=bar");
  assert.deepEqual(result.removedParams, ["session_id"]);
});

