import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdaptiveSheet } from "./AdaptiveSheet";

type Listener = () => void;

let host: HTMLDivElement;
let root: Root;
let matches = false;
let listeners: Listener[] = [];
let original: typeof window.matchMedia | undefined;

function stubMatchMedia() {
  window.matchMedia = ((query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    addEventListener: (_type: string, listener: Listener) =>
      listeners.push(listener),
    removeEventListener: (_type: string, listener: Listener) => {
      listeners = listeners.filter((item) => item !== listener);
    },
  })) as unknown as typeof window.matchMedia;
}

function render(side?: "bottom" | "left") {
  act(() =>
    root.render(
      createElement(
        AdaptiveSheet,
        { open: true, onClose: vi.fn(), title: "Tiêu đề", side },
        "Nội dung",
      ),
    ),
  );
}

function dialogHasDrawerShape() {
  const dialog = document.body.querySelector("[role='dialog']");
  return dialog?.className.includes("sm:rounded-ui") ?? false;
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  original = window.matchMedia;
  matches = false;
  listeners = [];
  stubMatchMedia();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  window.matchMedia = original as typeof window.matchMedia;
});

describe("AdaptiveSheet", () => {
  it("is a drawer on phones", () => {
    render();
    expect(document.body.textContent).toContain("Nội dung");
    expect(dialogHasDrawerShape()).toBe(false);
  });

  it("is a centered popup on desktop and follows the screen width", () => {
    matches = true;
    render();
    expect(document.body.textContent).toContain("Nội dung");
    expect(dialogHasDrawerShape()).toBe(true);

    matches = false;
    act(() => {
      for (const listener of listeners) listener();
    });
    expect(dialogHasDrawerShape()).toBe(false);
  });

  it("keeps side drawers as drawers even on desktop", () => {
    matches = true;
    render("left");
    expect(document.body.textContent).toContain("Nội dung");
    expect(dialogHasDrawerShape()).toBe(false);
  });

  it("falls back to the drawer when matchMedia is unavailable", () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    render();
    expect(document.body.textContent).toContain("Nội dung");
    expect(dialogHasDrawerShape()).toBe(false);
  });
});
