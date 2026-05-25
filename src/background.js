import { cleanUrl } from "./core/cleaner.js";
import { getEffectivePolicy } from "./core/policies.js";
import { getSettings } from "./core/settings.js";

const COPY_MENU_ID = "copy-clean-link";
const OFFSCREEN_DOCUMENT_PATH = "src/offscreen/offscreen.html";

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
    return;
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
  const hasOffscreenDocument = await ensureOffscreenDocument();

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

  return false;
});
