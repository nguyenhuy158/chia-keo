import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ApiParticipant, ApiSummary } from "../../shared/api-types";
import { SettlementTableCard } from "./SettlementTableCard";

const participants = [
  { id: "huy", name: "Huy" },
  { id: "kiet", name: "Kiệt" },
] as ApiParticipant[];

const summary = {
  balances: [
    { participantId: "huy", paid: 300000, owed: 100000, balance: 200000 },
    { participantId: "kiet", paid: 0, owed: 200000, balance: -200000 },
  ],
} as ApiSummary;

function render(overrides: Partial<Parameters<typeof SettlementTableCard>[0]>) {
  return renderToStaticMarkup(
    createElement(SettlementTableCard, {
      participants,
      summary,
      settlementMode: "pick",
      settlementHostId: "huy",
      roundDownRefunds: false,
      ...overrides,
    }),
  );
}

describe("SettlementTableCard", () => {
  it("shows the table with the host column", () => {
    const html = render({});
    expect(html).toContain("Bảng tổng hợp");
    expect(html).toContain("Chuyển cho Huy");
    expect(html).toContain("(nhận 200.000)");
    expect(html).toContain("200.000");
  });

  it("shows the remaining column without a host", () => {
    const html = render({ settlementMode: "p2p", settlementHostId: "" });
    expect(html).toContain("Còn lại");
    expect(html).toContain("trả 200.000");
  });

  it("renders nothing without people", () => {
    expect(render({ summary: { balances: [] } as unknown as ApiSummary })).toBe(
      "",
    );
  });
});
