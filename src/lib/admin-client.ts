const ADMIN_KEY_STORAGE = "f1_admin_api_key";
const ADMIN_KEY_EVENT = "f1-admin-key-changed";

export function getAdminApiKey() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(ADMIN_KEY_STORAGE) ?? "";
}

export function hasAdminApiKey() {
  return getAdminApiKey().length > 0;
}

export function setAdminApiKey(value: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ADMIN_KEY_STORAGE, value.trim());
  window.dispatchEvent(new Event(ADMIN_KEY_EVENT));
}

export function clearAdminApiKey() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ADMIN_KEY_STORAGE);
  window.dispatchEvent(new Event(ADMIN_KEY_EVENT));
}

export function onAdminApiKeyChange(listener: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === ADMIN_KEY_STORAGE) listener();
  };
  const onCustom = () => listener();

  window.addEventListener("storage", onStorage);
  window.addEventListener(ADMIN_KEY_EVENT, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(ADMIN_KEY_EVENT, onCustom);
  };
}

export function adminFetch(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers ?? {});
  const key = getAdminApiKey();
  if (key) {
    headers.set("x-admin-api-key", key);
  }

  return fetch(input, {
    ...init,
    headers
  });
}
