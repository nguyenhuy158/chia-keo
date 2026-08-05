import { describe, expect, it } from "vitest";
import {
  type ApiGameEvent,
  canUndoEvent,
  describeGameEvent,
  type GameEventPayload,
  type RestorableExpense,
} from "./game-events";

const restore: RestorableExpense = {
  payerParticipantId: "p1",
  kind: "expense",
  title: "Lẩu bò",
  amount: 425_000,
  note: "",
  splitMode: "equal",
  splits: [{ participantId: "p1", amount: 425_000, weight: null }],
};

function event(payload: GameEventPayload, undoneAt: string | null = null): ApiGameEvent {
  return { id: "e1", createdAt: "2026-08-05T10:00:00.000Z", undoneAt, payload };
}

describe("canUndoEvent", () => {
  it("chi khoan chi da xoa va con du lieu dung lai moi hoan tac duoc", () => {
    expect(canUndoEvent(event({ kind: "expense_removed", title: "Lẩu bò", amount: 425_000, payerName: "Hồng", restore }))).toBe(true);
  });

  it("khong hoan tac duoc khi thieu du lieu dung lai", () => {
    expect(
      canUndoEvent(
        event({ kind: "expense_removed", title: "Lẩu bò", amount: 425_000, payerName: "Hồng", restore: null }),
      ),
    ).toBe(false);
  });

  it("da hoan tac roi thi khong hoan tac lan hai", () => {
    expect(
      canUndoEvent(
        event(
          { kind: "expense_removed", title: "Lẩu bò", amount: 425_000, payerName: "Hồng", restore },
          "2026-08-05T11:00:00.000Z",
        ),
      ),
    ).toBe(false);
  });

  it("cac viec khac khong co hoan tac", () => {
    expect(canUndoEvent(event({ kind: "participant_removed", name: "Kiệt" }))).toBe(false);
    expect(
      canUndoEvent(event({ kind: "expense_updated", title: "Sân", amount: 1, beforeTitle: "Sân", beforeAmount: 2 })),
    ).toBe(false);
  });
});

describe("describeGameEvent", () => {
  it("khoan chi ghi ro so tien va nguoi tra", () => {
    const { title, detail } = describeGameEvent({
      kind: "expense_added",
      title: "Lẩu bò",
      amount: 425_000,
      payerName: "Hồng",
      splitNames: ["Huy", "Hường"],
    });

    expect(title).toBe("Thêm khoản Lẩu bò — 425k");
    expect(detail).toBe("Hồng trả · chia cho Huy, Hường");
  });

  it("sua khoan chi noi ro doi gi", () => {
    expect(
      describeGameEvent({
        kind: "expense_updated",
        title: "Lẩu bò",
        amount: 500_000,
        beforeTitle: "Lau bo",
        beforeAmount: 425_000,
      }).detail,
    ).toBe("Lau bo → Lẩu bò · 425k → 500k");
  });

  it("sua ma ten va tien khong doi thi noi chung chung, khong de trong", () => {
    const { detail } = describeGameEvent({
      kind: "expense_updated",
      title: "Sân",
      amount: 305_000,
      beforeTitle: "Sân",
      beforeAmount: 305_000,
    });

    expect(detail).not.toBe("");
  });

  it("them nhieu nguoi thi dem so luong", () => {
    expect(describeGameEvent({ kind: "participant_added", names: ["Huy", "Hường", "Nam"] }).title).toBe(
      "Thêm 3 người",
    );
    expect(describeGameEvent({ kind: "participant_added", names: ["Huy"] }).title).toBe("Thêm người");
  });

  it("moi kind deu co cau chu, khong kind nao ra rong", () => {
    const payloads: GameEventPayload[] = [
      { kind: "game_created", name: "DSKVUF" },
      { kind: "game_renamed", from: "A", to: "B" },
      { kind: "settlement_changed", mode: "pick", hostName: "Huy" },
      { kind: "settlement_changed", mode: "p2p", hostName: "" },
      { kind: "participant_added", names: ["Huy"] },
      { kind: "participant_renamed", from: "hồng", to: "Hồng" },
      { kind: "participant_removed", name: "Kiệt" },
      { kind: "expense_added", title: "Sân", amount: 305_000, payerName: "Nam", splitNames: [] },
      { kind: "expense_updated", title: "Sân", amount: 1, beforeTitle: "Sân", beforeAmount: 2 },
      { kind: "expense_removed", title: "Sân", amount: 305_000, payerName: "Nam", restore: null },
      { kind: "expense_restored", title: "Sân", amount: 305_000 },
      { kind: "transfer_added", fromName: "Huy", toName: "Hồng", amount: 85_000 },
    ];

    for (const payload of payloads) {
      expect(describeGameEvent(payload).title, payload.kind).not.toBe("");
    }
  });
});
