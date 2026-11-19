import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlayedDatePicker } from "./PlayedDatePicker";

let host: HTMLDivElement;
let root: Root;

function render(playedFrom: string, playedTo: string, onChange = vi.fn()) {
  act(() =>
    root.render(
      createElement(PlayedDatePicker, { playedFrom, playedTo, onChange }),
    ),
  );
  return onChange;
}

function click(selector: string) {
  act(() => (host.querySelector(selector) as HTMLButtonElement).click());
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("PlayedDatePicker", () => {
  it("shows the saved range", () => {
    render("2026-11-16", "2026-11-18");
    expect(host.textContent).toContain("16/11/2026");
    expect(host.textContent).toContain("18/11/2026");
  });

  it("saves one day when the same day is picked twice", () => {
    const onChange = render("2026-11-16", "");
    click("button[aria-label='Ngày chơi']");
    click("button[data-date='2026-11-20']");
    click("button[data-date='2026-11-20']");
    expect(onChange).toHaveBeenCalledWith("2026-11-20", "");
  });

  it("saves a range when two different days are picked", () => {
    const onChange = render("", "");
    expect(host.textContent).toContain("Ngày chơi");
    click("button[aria-label='Ngày chơi']");
    const today = host.querySelectorAll("button[data-date]");
    const first = today[2] as HTMLButtonElement;
    const second = today[4] as HTMLButtonElement;
    act(() => first.click());
    act(() => second.click());
    expect(onChange).toHaveBeenCalledWith(
      first.dataset.date,
      second.dataset.date,
    );
  });
});
