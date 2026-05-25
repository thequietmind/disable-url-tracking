import { DEFAULT_SETTINGS } from "./defaults.js";
import { callApi, extensionApi } from "./browser-api.js";

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

function getStorageAreas() {
  const storageAreas = [
    extensionApi?.storage?.sync,
    extensionApi?.storage?.local
  ].filter(Boolean);

  if (storageAreas.length === 0) {
    throw new Error("Browser storage is unavailable");
  }

  return storageAreas;
}

async function useStorageFallback(action) {
  let lastError;

  for (const storageArea of getStorageAreas()) {
    try {
      return await action(storageArea);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export function getDefaultSettings() {
  return clone(DEFAULT_SETTINGS);
}

export async function getSettings() {
  const result = await useStorageFallback((storageArea) =>
    callApi(storageArea.get.bind(storageArea), SETTINGS_KEY)
  );
  return mergeSettings(result[SETTINGS_KEY]);
}

export async function saveSettings(settings) {
  const mergedSettings = mergeSettings(settings);
  await useStorageFallback((storageArea) =>
    callApi(storageArea.set.bind(storageArea), {
      [SETTINGS_KEY]: mergedSettings
    })
  );
  return mergedSettings;
}

export async function resetSettings() {
  const defaults = getDefaultSettings();
  await useStorageFallback((storageArea) =>
    callApi(storageArea.set.bind(storageArea), { [SETTINGS_KEY]: defaults })
  );
  return defaults;
}
