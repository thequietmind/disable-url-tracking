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

test("cleaner removes expanded global tracking params", () => {
  const params = [
    "mtm_source",
    "ga_source",
    "_ga",
    "_gl",
    "yclid",
    "_openstat",
    "mkt_tok",
    "srsltid",
    "cmpid",
    "os_ehash",
    "__twitter_impression",
    "wt_mc",
    "wtrid",
    "tracking_source",
    "__hsfp",
    "__hssc",
    "__hstc",
    "__s",
    "hsCtaTracking",
    "ml_subscriber",
    "ml_subscriber_hash",
    "oly_anon_id",
    "oly_enc_id",
    "rb_clickid",
    "s_cid",
    "wickedid"
  ];

  for (const param of params) {
    const result = cleanUrl(`https://example.com/?${param}=1&keep=yes`);

    assert.equal(result.cleanedUrl, "https://example.com/?keep=yes", param);
    assert.deepEqual(result.removedParams, [param]);
  }
});

test("cleaner unwraps google redirect URLs", () => {
  const result = cleanUrl(
    "https://www.google.com/url?q=https%3A%2F%2Fexample.com%2Fpage%3Futm_source%3Dx%26foo%3Dbar"
  );

  assert.equal(result.cleanedUrl, "https://example.com/page?foo=bar");
  assert.deepEqual(result.removedParams, ["utm_source"]);
});

test("cleaner unwraps youtube redirect URLs", () => {
  const result = cleanUrl(
    "https://www.youtube.com/redirect?q=https%3A%2F%2Fexample.com%2Fwatch%3Ffbclid%3D1%26v%3D2"
  );

  assert.equal(result.cleanedUrl, "https://example.com/watch?v=2");
  assert.deepEqual(result.removedParams, ["fbclid"]);
});

test("cleaner unwraps facebook redirect URLs", () => {
  const result = cleanUrl(
    "https://www.facebook.com/l.php?u=https%3A%2F%2Fexample.com%2F%3Fgclid%3D1%26keep%3Dyes"
  );

  assert.equal(result.cleanedUrl, "https://example.com/?keep=yes");
  assert.deepEqual(result.removedParams, ["gclid"]);
});

test("cleaner unwraps duckduckgo redirect URLs", () => {
  const result = cleanUrl(
    "https://duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2F%3Fyclid%3D1%26keep%3Dyes"
  );

  assert.equal(result.cleanedUrl, "https://example.com/?keep=yes");
  assert.deepEqual(result.removedParams, ["yclid"]);
});

test("cleaner unwraps reddit redirect URLs", () => {
  const result = cleanUrl(
    "https://www.reddit.com/out?url=https%3A%2F%2Fexample.com%2F%3F_mkt%3Dno%26mkt_tok%3D1%26keep%3Dyes"
  );

  assert.equal(result.cleanedUrl, "https://example.com/?_mkt=no&keep=yes");
  assert.deepEqual(result.removedParams, ["mkt_tok"]);
});

test("cleaner does not unwrap non-http redirect targets", () => {
  const result = cleanUrl("https://www.google.com/url?q=javascript%3Aalert%281%29");

  assert.equal(result.cleanedUrl, "https://www.google.com/url?q=javascript%3Aalert%281%29");
  assert.equal(result.changed, false);
});

test("redirect unwrapping can be disabled by policy", () => {
  const result = cleanUrl(
    "https://www.google.com/url?q=https%3A%2F%2Fexample.com%2F%3Futm_source%3Dx",
    {
      redirectUnwrappingEnabled: false
    }
  );

  assert.equal(
    result.cleanedUrl,
    "https://www.google.com/url?q=https%3A%2F%2Fexample.com%2F%3Futm_source%3Dx"
  );
  assert.equal(result.changed, false);
});

test("disabled policy prevents redirect unwrapping and cleaning", () => {
  const result = cleanUrl(
    "https://www.google.com/url?q=https%3A%2F%2Fexample.com%2F%3Futm_source%3Dx",
    {
      mode: "disabled"
    }
  );

  assert.equal(
    result.cleanedUrl,
    "https://www.google.com/url?q=https%3A%2F%2Fexample.com%2F%3Futm_source%3Dx"
  );
  assert.equal(result.reason, "Cleaning disabled by policy");
});

test("compatibility policy allows manual redirect unwrapping", () => {
  const result = cleanUrl(
    "https://www.youtube.com/redirect?q=https%3A%2F%2Fexample.com%2F%3Ffbclid%3Dx",
    {
      mode: "compatibility",
      redirectUnwrappingEnabled: true
    }
  );

  assert.equal(result.cleanedUrl, "https://example.com/");
  assert.equal(result.changed, true);
});
