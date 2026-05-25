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

function paramRuleMatches(url, rule) {
  const [rawName, ...rawValueParts] = String(rule || "").split("=");
  const name = rawName.trim();
  const value = rawValueParts.join("=").trim();

  if (!name || !url.searchParams.has(name)) {
    return false;
  }

  return rawValueParts.length === 0 || url.searchParams.getAll(name).includes(value);
}

function getModeForUrl(url, mode, sitePolicy) {
  if (mode !== "clean") {
    return mode;
  }

  const compatibilityParams = sitePolicy.compatibilityParams || [];

  if (compatibilityParams.some((rule) => paramRuleMatches(url, rule))) {
    return "compatibility";
  }

  return mode;
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

  let url;
  let hostname = "";
  try {
    url = new URL(String(urlString || ""));
    hostname = url.hostname;
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
  const baseMode = sitePolicy.mode || (allowlisted || !blocklisted
    ? "disabled"
    : mergedSettings.defaultMode);
  const mode = getModeForUrl(url, baseMode, sitePolicy);
  const enabled = sitePolicy.enabled ?? mode !== "disabled";

  return {
    enabled,
    mode,
    hostname,
    redirectUnwrappingEnabled:
      enabled && mergedSettings.redirectUnwrappingEnabled !== false,
    preserveParams: sitePolicy.preserveParams || [],
    removeParams: sitePolicy.removeParams || [],
    compatibilityParams: sitePolicy.compatibilityParams || [],
    reason: enabled ? `Using ${mode} policy` : "Cleaning disabled by policy"
  };
}
