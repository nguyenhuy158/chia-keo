import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ApiExpense, ApiParticipant } from "../../shared/api-types";
import { PayerBreakdownCard } from "./PayerBreakdownCard";

const participants = [
  { id: "a", name: "An" },
  { id: "b", name: "Bình" },
] as ApiParticipant[];

const expenses = [
  {
    id: "1",
    kind: "expense",
    title: "Sân",
    amount: 300000,
    payerParticipantId: "a",
    excluded: false,
  },
  {
    id: "2",
    kind: "expense",
    title: "Cầu",
    amount: 84000,
    payerParticipantId: "a",
    excluded: false,
  },
  {
    id: "3",
    kind: "expense",
    title: "Nước",
    amount: 20000,
    payerParticipantId: "b",
    excluded: false,
  },
] as ApiExpense[];

let host: HTMLDivElement;
let root: Root;

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

function render(list: ApiExpense[]) {
  act(() =>
    root.render(
      createElement(PayerBreakdownCard, { expenses: list, participants }),
    ),
  );
}

describe("PayerBreakdownCard", () => {
  it("renders nothing without expenses", () => {
    render([]);
    expect(host.innerHTML).toBe("");
  });

  it("shows count and total per payer and expands the list on click", () => {
    render(expenses);
    expect(host.textContent).toContain("An");
    expect(host.textContent).toContain("(2 khoản)");
    expect(host.textContent).toContain("3 khoản chi");
    expect(host.textContent).not.toContain("Sân");

    const buttons = host.querySelectorAll<HTMLButtonElement>(
      "button[aria-expanded]",
    );
    act(() => buttons[0].click());
    expect(buttons[0].getAttribute("aria-expanded")).toBe("true");
    expect(host.textContent).toContain("Sân");
    expect(host.textContent).toContain("Cầu");
    expect(host.textContent).not.toContain("Nước");

    act(() => buttons[1].click());
    expect(host.textContent).toContain("Nước");
    expect(host.textContent).not.toContain("Sân");

    act(() => buttons[1].click());
    expect(host.textContent).not.toContain("Nước");
  });
});
