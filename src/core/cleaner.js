import { TRACKING_PARAM_PATTERNS } from "./defaults.js";

function normalizePattern(pattern) {
  return String(pattern || "").trim().toLowerCase();
}

function patternMatchesParam(paramName, pattern) {
  const normalizedName = paramName.toLowerCase();
  const normalizedPattern = normalizePattern(pattern);

  if (!normalizedPattern) {
    return false;
  }

  if (normalizedPattern.includes("*")) {
    const escaped = normalizedPattern
      .split("*")
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*");
    return new RegExp(`^${escaped}$`).test(normalizedName);
  }

  return normalizedName === normalizedPattern;
}

function paramMatchesAny(paramName, patterns = []) {
  return patterns.some((pattern) => patternMatchesParam(paramName, pattern));
}

function unique(values) {
  return [...new Set(values)];
}

function hostnameMatchesRule(hostname, rule) {
  const normalizedHostname = String(hostname || "").toLowerCase();
  const normalizedRule = String(rule || "").toLowerCase();

  return (
    normalizedHostname === normalizedRule ||
    normalizedHostname.endsWith(`.${normalizedRule}`)
  );
}

function getRedirectParamName(url) {
  const { hostname } = url;
  const pathname = url.pathname.replace(/\/$/, "") || "/";

  if (hostnameMatchesRule(hostname, "google.com") && pathname === "/url") {
    return url.searchParams.has("url") ? "url" : "q";
  }

  if (hostnameMatchesRule(hostname, "youtube.com") && pathname === "/redirect") {
    return "q";
  }

  if (hostnameMatchesRule(hostname, "facebook.com") && pathname === "/l.php") {
    return "u";
  }

  if (hostnameMatchesRule(hostname, "duckduckgo.com") && pathname === "/l") {
    return "uddg";
  }

  if (hostnameMatchesRule(hostname, "reddit.com") && pathname === "/out") {
    return "url";
  }

  return "";
}

function getSafeRedirectTarget(url) {
  const paramName = getRedirectParamName(url);

  if (!paramName) {
    return null;
  }

  const target = url.searchParams.get(paramName);

  if (!target) {
    return null;
  }

  try {
    const targetUrl = new URL(target);

    if (!["http:", "https:"].includes(targetUrl.protocol)) {
      return null;
    }

    return targetUrl;
  } catch {
    return null;
  }
}

export function cleanUrl(urlString, policy = {}) {
  const originalUrl = String(urlString || "");
  const baseResult = {
    originalUrl,
    cleanedUrl: originalUrl,
    changed: false,
    removedParams: [],
    preservedParams: [],
    reason: ""
  };

  if (policy.enabled === false || policy.mode === "disabled") {
    return {
      ...baseResult,
      reason: "Cleaning disabled by policy"
    };
  }

  let url;
  try {
    url = new URL(originalUrl);
  } catch {
    return {
      ...baseResult,
      reason: "Invalid URL"
    };
  }

  const redirectTarget = policy.redirectUnwrappingEnabled === false
    ? null
    : getSafeRedirectTarget(url);
  const redirectUnwrapped = Boolean(redirectTarget);

  if (redirectTarget) {
    url = redirectTarget;
  }

  const preserveParams = policy.preserveParams || [];
  const removeParams = [
    ...TRACKING_PARAM_PATTERNS,
    ...(policy.removeParams || [])
  ];
  const removedParams = [];
  const preservedParams = [];

  for (const paramName of [...url.searchParams.keys()]) {
    const shouldPreserve = paramMatchesAny(paramName, preserveParams);
    const shouldRemove = paramMatchesAny(paramName, removeParams);

    if (shouldPreserve) {
      preservedParams.push(paramName);
      continue;
    }

    if (shouldRemove) {
      url.searchParams.delete(paramName);
      removedParams.push(paramName);
    }
  }

  const changed = redirectUnwrapped || removedParams.length > 0;
  const reasons = [];

  if (redirectUnwrapped) {
    reasons.push("Unwrapped redirect");
  }

  if (removedParams.length > 0) {
    reasons.push("Removed tracking parameters");
  }

  return {
    originalUrl,
    cleanedUrl: changed ? url.toString() : originalUrl,
    changed,
    removedParams: unique(removedParams),
    preservedParams: unique(preservedParams),
    reason: changed ? reasons.join(" and ") : "No tracking parameters found"
  };
}

export const testExports = {
  getSafeRedirectTarget,
  paramMatchesAny,
  patternMatchesParam
};
