type BrowserStoreOptions<T> = {
  storageKey: string;
  eventName: string;
  defaultValue: T;
  normalize?: (value: T) => T;
};

export function createBrowserStore<T>({
  storageKey,
  eventName,
  defaultValue,
  normalize,
}: BrowserStoreOptions<T>) {
  const defaultJson = JSON.stringify(defaultValue);
  let cachedValue = normalize ? normalize(defaultValue) : defaultValue;
  let cachedRaw = defaultJson;

  function applyNormalization(value: T) {
    return normalize ? normalize(value) : value;
  }

  function resetStoredValue() {
    cachedRaw = defaultJson;
    cachedValue = applyNormalization(defaultValue);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, defaultJson);
    }

    return cachedValue;
  }

  function readStoredValue() {
    if (typeof window === "undefined") {
      return cachedValue;
    }

    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      return resetStoredValue();
    }

    if (stored === cachedRaw) {
      return cachedValue;
    }

    try {
      cachedRaw = stored;
      cachedValue = applyNormalization(JSON.parse(stored) as T);
      return cachedValue;
    } catch {
      return resetStoredValue();
    }
  }

  function persistValue(value: T) {
    cachedValue = applyNormalization(value);
    cachedRaw = JSON.stringify(cachedValue);
    window.localStorage.setItem(storageKey, cachedRaw);
    window.dispatchEvent(new Event(eventName));
  }

  function subscribeToValue(onChange: () => void) {
    const syncStorage = (event: StorageEvent) => {
      if (event.key && event.key !== storageKey) {
        return;
      }

      onChange();
    };

    window.addEventListener("storage", syncStorage);
    window.addEventListener(eventName, onChange);

    return () => {
      window.removeEventListener("storage", syncStorage);
      window.removeEventListener(eventName, onChange);
    };
  }

  return {
    defaultValue: cachedValue,
    readStoredValue,
    persistValue,
    subscribeToValue,
  };
}
