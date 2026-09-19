/**
 * Vitest setup. Runs before every test file.
 */

import "fake-indexeddb/auto";

// Provide a fake localStorage if the environment lacks one
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
  } as Storage;
}

// Suppress noisy console.warn in tests, except for our own
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const msg = String(args[0] ?? "");
  if (msg.startsWith("[test]") || msg.startsWith("Sisonkhe")) {
    originalWarn(...args);
  }
};
