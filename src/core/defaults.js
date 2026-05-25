export const TRACKING_PARAM_PATTERNS = [
  "utm_*",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "dclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "ref",
  "ref_src",
  "spm",
  "vero_id",
  "_hsenc",
  "_hsmi",
  "pk_campaign",
  "pk_kwd",
  "twclid"
];

export const DEFAULT_SETTINGS = {
  globalEnabled: true,
  defaultMode: "clean",
  allowlist: [],
  blocklist: [],
  sitePolicies: {
    "google.com": {
      mode: "compatibility"
    }
  }
};

