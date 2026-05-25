import { cleanUrl } from "./core/cleaner.js";
import { getEffectivePolicy } from "./core/policies.js";
import { getSettings } from "./core/settings.js";

const COPY_MENU_ID = "copy-clean-link";
const OFFSCREEN_DOCUMENT_PATH = "src/offscreen/offscreen.html";
const pendingAutoCleanUrlsByTab = new Map();
const lastAutoCleanResultsByTab = new Map();

function isWebUrl(url) {
  try {
    return ["http:", "https:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

function shouldCleanAutomatically(policy) {
  return policy.enabled && policy.mode === "clean";
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  return tab;
}

async function getCleanResult(url) {
  const settings = await getSettings();
  const policy = getEffectivePolicy(url, settings);
  return cleanUrl(url, policy);
}

async function cleanTabUrlAutomatically(tabId, url) {
  const pendingUrl = pendingAutoCleanUrlsByTab.get(tabId);

  if (pendingUrl === url) {
    pendingAutoCleanUrlsByTab.delete(tabId);
    return;
  }

  pendingAutoCleanUrlsByTab.delete(tabId);

  if (!isWebUrl(url)) {
    return;
  }

  const settings = await getSettings();
  const policy = getEffectivePolicy(url, settings);

  if (!shouldCleanAutomatically(policy)) {
    return;
  }

  const result = cleanUrl(url, policy);

  if (!result.changed) {
    return;
  }

  pendingAutoCleanUrlsByTab.set(tabId, result.cleanedUrl);
  lastAutoCleanResultsByTab.set(tabId, result);

  try {
    await chrome.tabs.update(tabId, { url: result.cleanedUrl });
  } catch (error) {
    pendingAutoCleanUrlsByTab.delete(tabId);
    throw error;
  }
}

async function ensureOffscreenDocument() {
  if (!chrome.offscreen || !chrome.runtime.getContexts) {
    return false;
  }

  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl]
  });

  if (existingContexts.length > 0) {
    return true;
  }

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: ["CLIPBOARD"],
    justification: "Copy cleaned URLs from the context menu."
  });
  return true;
}

async function copyTextFromBackgroundPage(text) {
  if (globalThis.navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (!globalThis.document) {
    throw new Error("Clipboard is unavailable");
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

async function copyText(text) {
  let hasOffscreenDocument = false;

  try {
    hasOffscreenDocument = await ensureOffscreenDocument();
  } catch {
    hasOffscreenDocument = false;
  }

  if (hasOffscreenDocument) {
    await chrome.runtime.sendMessage({
      type: "copyText",
      text
    });
    return;
  }

  await copyTextFromBackgroundPage(text);
}

async function cleanCurrentTab() {
  const tab = await getActiveTab();

  if (!tab?.id || !tab.url) {
    return {
      changed: false,
      reason: "No active tab URL found"
    };
  }

  const result = await getCleanResult(tab.url);

  if (result.changed) {
    await chrome.tabs.update(tab.id, { url: result.cleanedUrl });
  }

  return result;
}

async function copyCleanCurrentUrl() {
  const tab = await getActiveTab();

  if (!tab?.url) {
    return {
      changed: false,
      reason: "No active tab URL found"
    };
  }

  const result = await getCleanResult(tab.url);
  await copyText(result.cleanedUrl);
  return {
    ...result,
    reason: result.changed ? "Copied clean URL" : result.reason
  };
}

async function getLastAutoCleanResult() {
  const tab = await getActiveTab();

  if (!tab?.id) {
    return null;
  }

  return lastAutoCleanResultsByTab.get(tab.id) || null;
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: COPY_MENU_ID,
    title: "Copy clean link",
    contexts: ["link"]
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== COPY_MENU_ID || !info.linkUrl) {
    return;
  }

  getCleanResult(info.linkUrl)
    .then((result) => copyText(result.cleanedUrl))
    .catch((error) => console.error(error));
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!changeInfo.url) {
    return;
  }

  cleanTabUrlAutomatically(tabId, changeInfo.url).catch((error) => {
    console.error(error);
  });
});

if (chrome.webNavigation) {
  chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameId !== 0) {
      return;
    }

    cleanTabUrlAutomatically(details.tabId, details.url).catch((error) => {
      console.error(error);
    });
  });

  chrome.webNavigation.onCommitted.addListener((details) => {
    if (details.frameId !== 0) {
      return;
    }

    cleanTabUrlAutomatically(details.tabId, details.url).catch((error) => {
      console.error(error);
    });
  });

  chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
    if (details.frameId !== 0) {
      return;
    }

    cleanTabUrlAutomatically(details.tabId, details.url).catch((error) => {
      console.error(error);
    });
  });
}

chrome.tabs.onRemoved.addListener((tabId) => {
  pendingAutoCleanUrlsByTab.delete(tabId);
  lastAutoCleanResultsByTab.delete(tabId);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "cleanCurrentTab") {
    cleanCurrentTab()
      .then(sendResponse)
      .catch((error) => sendResponse({ changed: false, reason: error.message }));
    return true;
  }

  if (message?.type === "copyCleanCurrentUrl") {
    copyCleanCurrentUrl()
      .then(sendResponse)
      .catch((error) => sendResponse({ changed: false, reason: error.message }));
    return true;
  }

  if (message?.type === "getLastAutoCleanResult") {
    getLastAutoCleanResult()
      .then(sendResponse)
      .catch(() => sendResponse(null));
    return true;
  }

  return false;
});
