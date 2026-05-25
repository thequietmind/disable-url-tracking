export const extensionApi = globalThis.browser || globalThis.chrome;

export function callApi(method, ...args) {
  if (globalThis.browser) {
    return Promise.resolve(method(...args));
  }

  return new Promise((resolve, reject) => {
    let callbackSettled = false;

    function callback(result) {
      callbackSettled = true;

      const error = extensionApi?.runtime?.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }

      resolve(result);
    }

    try {
      const maybePromise = method(...args, callback);

      if (maybePromise?.then) {
        maybePromise.then(resolve, reject);
        return;
      }

      if (maybePromise !== undefined && !callbackSettled) {
        resolve(maybePromise);
      }
    } catch (error) {
      reject(error);
    }
  });
}

export async function queryActiveTab() {
  const queries = [
    { active: true, currentWindow: true },
    { active: true, lastFocusedWindow: true },
    { active: true }
  ];

  for (const query of queries) {
    const tabs = await callApi(extensionApi.tabs.query.bind(extensionApi.tabs), query);

    if (tabs?.[0]) {
      return tabs[0];
    }
  }

  return null;
}
