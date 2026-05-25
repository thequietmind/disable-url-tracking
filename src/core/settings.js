import { DEFAULT_SETTINGS } from "./defaults.js";

const SETTINGS_KEY = "settings";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeSettings(settings) {
  return {
    ...clone(DEFAULT_SETTINGS),
    ...(settings || {}),
    allowlist: settings?.allowlist || clone(DEFAULT_SETTINGS.allowlist),
    blocklist: settings?.blocklist || clone(DEFAULT_SETTINGS.blocklist),
    sitePolicies: {
      ...clone(DEFAULT_SETTINGS.sitePolicies),
      ...(settings?.sitePolicies || {})
    }
  };
}

function getStorageArea() {
  if (!globalThis.chrome?.storage?.sync) {
    throw new Error("chrome.storage.sync is unavailable");
  }

  return globalThis.chrome.storage.sync;
}

export function getDefaultSettings() {
  return clone(DEFAULT_SETTINGS);
}

export async function getSettings() {
  const result = await getStorageArea().get(SETTINGS_KEY);
  return mergeSettings(result[SETTINGS_KEY]);
}

export async function saveSettings(settings) {
  const mergedSettings = mergeSettings(settings);
  await getStorageArea().set({ [SETTINGS_KEY]: mergedSettings });
  return mergedSettings;
}

export async function resetSettings() {
  const defaults = getDefaultSettings();
  await getStorageArea().set({ [SETTINGS_KEY]: defaults });
  return defaults;
}

