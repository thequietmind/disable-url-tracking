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

  const changed = removedParams.length > 0;

  return {
    originalUrl,
    cleanedUrl: changed ? url.toString() : originalUrl,
    changed,
    removedParams: unique(removedParams),
    preservedParams: unique(preservedParams),
    reason: changed ? "Removed tracking parameters" : "No tracking parameters found"
  };
}

export const testExports = {
  paramMatchesAny,
  patternMatchesParam
};

