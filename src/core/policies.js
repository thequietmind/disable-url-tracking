import { DEFAULT_SETTINGS } from "./defaults.js";

function normalizeHostname(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "www.")
    .split("/")[0]
    .split(":")[0]
    .replace(/^\*\./, "")
    .replace(/^\./, "");
}

function cloneSettings(settings) {
  return {
    ...DEFAULT_SETTINGS,
    ...(settings || {}),
    allowlist: settings?.allowlist || DEFAULT_SETTINGS.allowlist,
    blocklist: settings?.blocklist || DEFAULT_SETTINGS.blocklist,
    sitePolicies: {
      ...DEFAULT_SETTINGS.sitePolicies,
      ...(settings?.sitePolicies || {})
    }
  };
}

function findSitePolicy(hostname, sitePolicies = {}) {
  return Object.entries(sitePolicies)
    .filter(([rule]) => hostnameMatchesRule(hostname, rule))
    .sort((a, b) => normalizeHostname(b[0]).length - normalizeHostname(a[0]).length)[0];
}

export function hostnameMatchesRule(hostname, rule) {
  const normalizedHostname = normalizeHostname(hostname);
  const normalizedRule = normalizeHostname(rule);

  if (!normalizedHostname || !normalizedRule) {
    return false;
  }

  return (
    normalizedHostname === normalizedRule ||
    normalizedHostname.endsWith(`.${normalizedRule}`)
  );
}

export function getEffectivePolicy(urlString, settings = DEFAULT_SETTINGS) {
  const mergedSettings = cloneSettings(settings);

  if (!mergedSettings.globalEnabled) {
    return {
      enabled: false,
      mode: "disabled",
      redirectUnwrappingEnabled: false,
      preserveParams: [],
      removeParams: [],
      reason: "Global cleaning is disabled"
    };
  }

  let hostname = "";
  try {
    hostname = new URL(String(urlString || "")).hostname;
  } catch {
    return {
      enabled: false,
      mode: "disabled",
      redirectUnwrappingEnabled: false,
      preserveParams: [],
      removeParams: [],
      reason: "Invalid URL"
    };
  }

  const allowlisted = mergedSettings.allowlist.some((rule) =>
    hostnameMatchesRule(hostname, rule)
  );
  const blocklisted =
    mergedSettings.blocklist.length === 0 ||
    mergedSettings.blocklist.some((rule) => hostnameMatchesRule(hostname, rule));
  const matchingPolicy = findSitePolicy(hostname, mergedSettings.sitePolicies);
  const sitePolicy = matchingPolicy?.[1] || {};
  const mode = sitePolicy.mode || (allowlisted || !blocklisted
    ? "disabled"
    : mergedSettings.defaultMode);
  const enabled = sitePolicy.enabled ?? mode !== "disabled";

  return {
    enabled,
    mode,
    hostname,
    redirectUnwrappingEnabled:
      enabled && mergedSettings.redirectUnwrappingEnabled !== false,
    preserveParams: sitePolicy.preserveParams || [],
    removeParams: sitePolicy.removeParams || [],
    reason: enabled ? `Using ${mode} policy` : "Cleaning disabled by policy"
  };
}
