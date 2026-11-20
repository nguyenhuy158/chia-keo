import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to?: string }) =>
    createElement("a", { href: to }, children),
}));

import { HelpPage } from "./HelpPage";
import { HELP_GROUPS } from "./help-content";

const helpImageFiles = Object.keys(
  import.meta.glob("../../../public/help/*.png"),
);

let host: HTMLDivElement;
let root: Root;

function topicButton(title: string) {
  return [...host.querySelectorAll("button")].find((item) =>
    item.textContent?.includes(title),
  ) as HTMLButtonElement;
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(createElement(HelpPage)));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("HelpPage", () => {
  it("lists the four groups with every topic title", () => {
    expect(host.querySelector("h1")?.textContent).toBe("Hướng dẫn sử dụng");
    expect(HELP_GROUPS.map((group) => group.title)).toEqual([
      "Chia tiền cơ bản",
      "Thanh toán và chia sẻ",
      "Tính năng nâng cao",
      "Quản lý và công cụ phụ",
    ]);
    for (const group of HELP_GROUPS) {
      expect(host.textContent).toContain(group.title);
      for (const topic of group.topics)
        expect(topicButton(topic.title)).toBeDefined();
    }
  });

  it("opens the first topic and expands another on demand", () => {
    const first = HELP_GROUPS[0].topics[0];
    expect(topicButton(first.title).getAttribute("aria-expanded")).toBe("true");
    expect(host.textContent).toContain(first.steps[0]);

    const exclude = HELP_GROUPS[2].topics.find(
      (topic) => topic.id === "exclude",
    );
    if (!exclude) throw new Error("missing exclude topic");
    expect(topicButton(exclude.title).getAttribute("aria-expanded")).toBe(
      "false",
    );
    expect(host.textContent).not.toContain(exclude.steps[0]);
    act(() => topicButton(exclude.title).click());
    expect(host.textContent).toContain(exclude.steps[0]);
  });

  it("gives every topic at least one step and unique ids", () => {
    const ids = HELP_GROUPS.flatMap((group) =>
      group.topics.map((topic) => topic.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
    for (const group of HELP_GROUPS) {
      for (const topic of group.topics)
        expect(topic.steps.length).toBeGreaterThan(0);
    }
  });

  it("shows the screenshot and the real-place links of an opened topic", () => {
    const create = HELP_GROUPS[0].topics[0];
    const image = host.querySelector(`img[src="${create.image?.src}"]`);
    expect(image?.getAttribute("alt")).toBe(create.image?.alt);
    expect(
      [...host.querySelectorAll("a")].some(
        (link) =>
          link.getAttribute("href") === "/" &&
          link.textContent?.includes("Mở trang chủ"),
      ),
    ).toBe(true);
  });

  it("points every topic image at an existing file and every link at a known page", () => {
    const topics = HELP_GROUPS.flatMap((group) => group.topics);
    const withImages = topics.filter((topic) => topic.image);
    expect(withImages.length).toBeGreaterThan(5);
    for (const topic of withImages) {
      expect(topic.image?.alt.length).toBeGreaterThan(0);
      expect(helpImageFiles, topic.image?.src).toContain(
        `../../../public${topic.image?.src}`,
      );
    }
    const pages = new Set(["/", "/shuttles", "/fun", "/settings"]);
    for (const topic of topics) {
      for (const link of topic.links ?? [])
        expect(pages.has(link.to)).toBe(true);
    }
  });
});
