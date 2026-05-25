async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "copyText") {
    return false;
  }

  copyText(message.text)
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, reason: error.message }));
  return true;
});

