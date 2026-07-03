import "@testing-library/jest-dom/vitest";

const items = new Map<string, string>();
const storage: Storage = {
  get length() {
    return items.size;
  },
  clear() {
    items.clear();
  },
  getItem(key) {
    return items.get(key) || null;
  },
  key(index) {
    return Array.from(items.keys())[index] || null;
  },
  removeItem(key) {
    items.delete(key);
  },
  setItem(key, value) {
    items.set(key, value);
  },
};

Object.defineProperty(globalThis, "localStorage", {
  value: storage,
  configurable: true,
});

Object.defineProperty(window, "localStorage", {
  value: storage,
  configurable: true,
});
