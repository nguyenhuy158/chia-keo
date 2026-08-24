import { describe, expect, it } from "vitest";
import {
  CLOSE_MODE_NONE,
  describeCloseMode,
  isClosed,
  isFullySettled,
  shouldAutoClose,
  shouldAutoReopen,
  toCloseMode,
} from "./game-closing";
import type { BalanceRow } from "./split";

function balance(participantId: string, value: number): BalanceRow {
  return { participantId, paid: 0, owed: 0, balance: value };
}

const OPEN = { closedAt: null, closeMode: CLOSE_MODE_NONE } as const;
const CLOSED_AUTO = { closedAt: "2026-01-01T00:00:00.000Z", closeMode: "auto" } as const;
const CLOSED_MANUAL = { closedAt: "2026-01-01T00:00:00.000Z", closeMode: "manual" } as const;

describe("toCloseMode", () => {
  it("ep gia tri la ve rong", () => {
    expect(toCloseMode("auto")).toBe("auto");
    expect(toCloseMode("manual")).toBe("manual");
    expect(toCloseMode("bogus")).toBe(CLOSE_MODE_NONE);
  });
});

describe("isFullySettled", () => {
  it("cuoc chua co khoan chi thi khong tinh la tra xong", () => {
    expect(isFullySettled([], 0)).toBe(false);
    expect(isFullySettled([balance("p1", 0)], 0)).toBe(false);
  });

  it("moi so du ve 0 la tra xong", () => {
    expect(isFullySettled([balance("p1", 0), balance("p2", 0)], 2)).toBe(true);
  });

  it("con ai lech thi chua xong", () => {
    expect(isFullySettled([balance("p1", 50_000), balance("p2", -50_000)], 2)).toBe(false);
  });
});

describe("shouldAutoClose", () => {
  it("dong cuoc dang choi khi vua tra xong", () => {
    expect(shouldAutoClose(OPEN, true)).toBe(true);
  });

  it("khong dong lai cuoc da dong, va khong dong khi con no", () => {
    expect(shouldAutoClose(CLOSED_AUTO, true)).toBe(false);
    expect(shouldAutoClose(OPEN, false)).toBe(false);
  });
});

describe("shouldAutoReopen", () => {
  it("mo lai cuoc tu dong dong khi so du lech tro lai", () => {
    expect(shouldAutoReopen(CLOSED_AUTO, false)).toBe(true);
  });

  it("cuoc dong tay giu nguyen trang thai dong", () => {
    expect(shouldAutoReopen(CLOSED_MANUAL, false)).toBe(false);
  });

  it("khong mo lai khi van dang tra xong hoac cuoc dang choi", () => {
    expect(shouldAutoReopen(CLOSED_AUTO, true)).toBe(false);
    expect(shouldAutoReopen(OPEN, false)).toBe(false);
  });
});

describe("isClosed / describeCloseMode", () => {
  it("phan biet dang choi va da dong", () => {
    expect(isClosed(OPEN)).toBe(false);
    expect(isClosed(CLOSED_MANUAL)).toBe(true);
  });

  it("nhan chi co o cuoc da dong", () => {
    expect(describeCloseMode(CLOSE_MODE_NONE)).toBe("");
    expect(describeCloseMode("auto")).toBe("tự đóng");
    expect(describeCloseMode("manual")).toBe("đóng tay");
  });
});
