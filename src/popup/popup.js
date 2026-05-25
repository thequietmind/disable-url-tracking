import { getSettings, saveSettings } from "../core/settings.js";
import { getEffectivePolicy } from "../core/policies.js";

const elements = {
  globalEnabled: document.querySelector("#global-enabled"),
  hostname: document.querySelector("#hostname"),
  siteMode: document.querySelector("#site-mode"),
  cleanCurrent: document.querySelector("#clean-current"),
  copyClean: document.querySelector("#copy-clean"),
  status: document.querySelector("#status")
};

let activeTab;
let settings;

function setStatus(message) {
  elements.status.textContent = message;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  return tab;
}

function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function ensureSitePolicy(hostname) {
  settings.sitePolicies[hostname] = settings.sitePolicies[hostname] || {};
  return settings.sitePolicies[hostname];
}

async function saveSiteMode(mode) {
  const hostname = getHostname(activeTab?.url);

  if (!hostname) {
    return;
  }

  if (mode === "default") {
    delete settings.sitePolicies[hostname];
  } else {
    ensureSitePolicy(hostname).mode = mode;
  }

  settings = await saveSettings(settings);
  setStatus("Site mode saved");
}

async function saveGlobalEnabled(enabled) {
  settings.globalEnabled = enabled;
  settings = await saveSettings(settings);
  setStatus(enabled ? "Extension enabled" : "Extension disabled");
}

async function sendAction(type) {
  const result = await chrome.runtime.sendMessage({ type });
  const removed = result?.removedParams?.length
    ? ` Removed: ${result.removedParams.join(", ")}.`
    : "";
  setStatus(`${result?.reason || "Done"}.${removed}`);
}

async function render() {
  settings = await getSettings();
  activeTab = await getActiveTab();

  const hostname = getHostname(activeTab?.url);
  const policy = activeTab?.url
    ? getEffectivePolicy(activeTab.url, settings)
    : { mode: "disabled" };

  elements.globalEnabled.checked = settings.globalEnabled;
  elements.hostname.textContent = hostname || "No active tab URL";
  elements.siteMode.value =
    settings.sitePolicies[hostname]?.mode || (policy.mode === settings.defaultMode
      ? "default"
      : policy.mode);

  const lastAutoCleanResult = await chrome.runtime.sendMessage({
    type: "getLastAutoCleanResult"
  });

  if (lastAutoCleanResult?.changed) {
    setStatus(`Last auto-cleaned: ${lastAutoCleanResult.removedParams.join(", ")}`);
  }
}

elements.globalEnabled.addEventListener("change", (event) => {
  saveGlobalEnabled(event.target.checked);
});

elements.siteMode.addEventListener("change", (event) => {
  saveSiteMode(event.target.value);
});

elements.cleanCurrent.addEventListener("click", () => {
  sendAction("cleanCurrentTab");
});

elements.copyClean.addEventListener("click", () => {
  sendAction("copyCleanCurrentUrl");
});

render().catch((error) => setStatus(error.message));
