import {
  getDefaultSettings,
  getSettings,
  resetSettings,
  saveSettings
} from "../core/settings.js";

const elements = {
  globalEnabled: document.querySelector("#global-enabled"),
  redirectUnwrappingEnabled: document.querySelector("#redirect-unwrapping-enabled"),
  defaultMode: document.querySelector("#default-mode"),
  allowlist: document.querySelector("#allowlist"),
  blocklist: document.querySelector("#blocklist"),
  policyRows: document.querySelector("#policy-rows"),
  addPolicy: document.querySelector("#add-policy"),
  save: document.querySelector("#save"),
  reset: document.querySelector("#reset"),
  resetDefaults: document.querySelector("#reset-defaults"),
  status: document.querySelector("#status")
};

function splitLines(value) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function splitParams(value) {
  return value
    .split(",")
    .map((param) => param.trim())
    .filter(Boolean);
}

function joinParams(params = []) {
  return params.join(", ");
}

function setStatus(message) {
  elements.status.textContent = message;
}

function createModeSelect(value = "default") {
  const select = document.createElement("select");

  for (const mode of ["default", "clean", "compatibility", "disabled"]) {
    const option = document.createElement("option");
    option.value = mode;
    option.textContent = mode[0].toUpperCase() + mode.slice(1);
    select.append(option);
  }

  select.value = value;
  return select;
}

function addPolicyRow(domain = "", policy = {}) {
  const domainInput = document.createElement("input");
  const preserveInput = document.createElement("input");
  const removeInput = document.createElement("input");
  const removeButton = document.createElement("button");
  const modeSelect = createModeSelect(policy.mode || "default");

  domainInput.placeholder = "example.com";
  domainInput.value = domain;
  preserveInput.placeholder = "ref, session";
  preserveInput.value = joinParams(policy.preserveParams);
  removeInput.placeholder = "custom_id, promo_*";
  removeInput.value = joinParams(policy.removeParams);
  removeButton.type = "button";
  removeButton.className = "remove-policy";
  removeButton.textContent = "Remove";

  removeButton.addEventListener("click", () => {
    for (const element of [
      domainInput,
      modeSelect,
      preserveInput,
      removeInput,
      removeButton
    ]) {
      element.remove();
    }
  });

  elements.policyRows.append(
    domainInput,
    modeSelect,
    preserveInput,
    removeInput,
    removeButton
  );
}

function clearPolicies() {
  elements.policyRows.replaceChildren();
}

function render(settings) {
  elements.globalEnabled.checked = settings.globalEnabled;
  elements.redirectUnwrappingEnabled.checked =
    settings.redirectUnwrappingEnabled !== false;
  elements.defaultMode.value = settings.defaultMode;
  elements.allowlist.value = settings.allowlist.join("\n");
  elements.blocklist.value = settings.blocklist.join("\n");
  clearPolicies();

  for (const [domain, policy] of Object.entries(settings.sitePolicies)) {
    addPolicyRow(domain, policy);
  }
}

function collectPolicies() {
  const children = [...elements.policyRows.children];
  const policies = {};

  for (let index = 0; index < children.length; index += 5) {
    const domain = children[index].value.trim().toLowerCase();
    const mode = children[index + 1].value;
    const preserveParams = splitParams(children[index + 2].value);
    const removeParams = splitParams(children[index + 3].value);

    if (!domain) {
      continue;
    }

    policies[domain] = {};

    if (mode !== "default") {
      policies[domain].mode = mode;
    }

    if (preserveParams.length > 0) {
      policies[domain].preserveParams = preserveParams;
    }

    if (removeParams.length > 0) {
      policies[domain].removeParams = removeParams;
    }
  }

  return policies;
}

function collectSettings() {
  return {
    globalEnabled: elements.globalEnabled.checked,
    redirectUnwrappingEnabled: elements.redirectUnwrappingEnabled.checked,
    defaultMode: elements.defaultMode.value,
    allowlist: splitLines(elements.allowlist.value),
    blocklist: splitLines(elements.blocklist.value),
    sitePolicies: collectPolicies()
  };
}

async function loadSavedSettings() {
  render(await getSettings());
  setStatus("Settings loaded");
}

elements.addPolicy.addEventListener("click", () => addPolicyRow());

elements.save.addEventListener("click", async () => {
  await saveSettings(collectSettings());
  setStatus("Settings saved");
});

elements.reset.addEventListener("click", loadSavedSettings);

elements.resetDefaults.addEventListener("click", async () => {
  render(await resetSettings());
  setStatus("Default settings restored");
});

render(getDefaultSettings());
loadSavedSettings().catch((error) => setStatus(error.message));
