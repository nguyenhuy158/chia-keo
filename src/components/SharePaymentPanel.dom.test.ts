import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ApiPaymentOptions,
  ApiPaymentRequest,
} from "../../shared/api-types";

const { state, mutateAsync } = vi.hoisted(() => ({
  state: {
    options: undefined as ApiPaymentOptions | undefined,
    payment: undefined as ApiPaymentRequest | undefined,
    createError: false,
  },
  mutateAsync: vi.fn(),
}));

vi.mock("../adapters/react-query/queries", () => ({
  usePaymentOptions: () => ({ data: state.options }),
  useCreatePayment: () => ({
    mutateAsync,
    isPending: false,
    isError: state.createError,
  }),
  usePaymentRequest: () => ({ data: state.payment }),
}));
vi.mock("../core/container", () => ({
  getQrProvider: () => ({
    buildUrl: (_p: unknown, amount: number, ref: string) =>
      `qr:${amount}:${ref}`,
  }),
}));

import { SharePaymentPanel } from "./SharePaymentPanel";

const huy = {
  id: "huy",
  name: "Huy",
  bankId: "MB",
  accountNo: "0123",
  accountName: "HUY",
};
const people = [huy, { ...huy, id: "an", name: "An" }];
const pending: ApiPaymentRequest = {
  code: "CKAAAA2222",
  receiver: huy,
  items: [{ participantId: "an", amount: 100_000 }],
  total: 100_000,
  status: "pending",
  paidAmount: 0,
};

let host: HTMLDivElement;
let root: Root;

function render() {
  act(() =>
    root.render(
      createElement(SharePaymentPanel, { token: "tok", participants: people }),
    ),
  );
}

function click(label: string) {
  const button = [...document.querySelectorAll("button")].find((item) =>
    item.textContent?.includes(label),
  );
  act(() => button?.click());
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  state.options = {
    receiver: huy,
    options: [
      { participantId: "an", amount: 100_000 },
      { participantId: "ghost", amount: 50_000 },
    ],
  };
  state.payment = undefined;
  state.createError = false;
  mutateAsync.mockReset().mockResolvedValue(pending);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = "";
});

describe("SharePaymentPanel", () => {
  it("an khi SePay khong nhan tien cho cuoc nay", () => {
    state.options = undefined;
    render();
    expect(host.textContent).toBe("");
    state.options = { receiver: huy, options: [] };
    render();
    expect(host.textContent).toBe("");
  });

  it("chon nguoi, tao QR roi cho tien ve", async () => {
    render();
    expect(host.textContent).toContain("Chuyển khoản cho Huy");
    click("Thanh toán");
    expect(document.body.textContent).toContain("Không rõ");
    expect(document.body.textContent).toContain("Chọn ít nhất một người");

    const checkbox = document.querySelector<HTMLInputElement>(
      'input[type="checkbox"]',
    );
    act(() => checkbox?.click());
    act(() => checkbox?.click());
    act(() => checkbox?.click());
    expect(document.body.textContent).toContain("Tạo QR");

    await act(async () => click("Tạo QR"));
    expect(mutateAsync).toHaveBeenCalledWith(["an"]);
    expect(document.body.textContent).toContain("Đang tải");

    state.payment = pending;
    render();
    expect(document.querySelector("img")?.getAttribute("src")).toBe(
      "qr:100000:CKAAAA2222",
    );
    expect(document.body.textContent).toContain("CKAAAA2222");

    state.payment = { ...pending, paidAmount: 40_000 };
    render();
    expect(document.body.textContent).toContain("chuyển thêm phần còn thiếu");
    expect(document.querySelector("img")?.getAttribute("src")).toBe(
      "qr:60000:CKAAAA2222",
    );

    state.payment = { ...pending, status: "paid", paidAmount: 100_000 };
    render();
    expect(document.body.textContent).toContain("Đã nhận");

    act(() =>
      document
        .querySelector<HTMLButtonElement>('button[aria-label="Đóng"]')
        ?.click(),
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("bao loi khi khong tao duoc ma", () => {
    state.createError = true;
    render();
    click("Thanh toán");
    expect(document.body.textContent).toContain("Không tạo được mã thanh toán");
  });
});
