import { describe, expect, it } from "vitest";
import type { ApiExpense, ApiParticipant, ApiSummary } from "./api-types";
import { allocateAmount, calculateBalances, calculateSettlements } from "./split";
import { buildSummaryText, formatThousands } from "./summary-text";

const SHARE_URL = "https://chia-keo.test/share/tok3n";

function makeParticipant(id: string, name: string): ApiParticipant {
  return { id, name, bankId: "", accountNo: "", accountName: "" };
}

function makeExpense(
  id: string,
  title: string,
  amount: number,
  payerParticipantId: string,
  splitParticipantIds: string[],
): ApiExpense {
  return {
    id,
    kind: "expense",
    title,
    amount,
    note: "",
    payerParticipantId,
    splitMode: "equal",
    splitParticipantIds,
    splits: allocateAmount(amount, splitParticipantIds).map((share) => ({
      ...share,
      weight: null,
    })),
    createdAt: `2026-08-03T00:00:0${id.length}.000Z`,
  };
}

function makeSummary(participants: ApiParticipant[], expenses: ApiExpense[]): ApiSummary {
  const balances = calculateBalances(
    participants.map((participant) => participant.id),
    expenses.map((expense) => ({
      payerParticipantId: expense.payerParticipantId,
      amount: expense.amount,
      shares: expense.splits,
    })),
  );

  return {
    totalExpense: expenses.reduce((total, expense) => total + expense.amount, 0),
    balances,
    settlements: calculateSettlements(balances),
  };
}

const thu = makeParticipant("p-thu", "Thu");
const hong = makeParticipant("p-hong", "Hồng");
const nam = makeParticipant("p-nam", "Nam");
const participants = [thu, hong, nam];

/** API tra ve khoan chi moi nhat truoc, nen fixture cung xep nguoc thoi gian. */
const traTac = makeExpense("e-1", "Trà tắc", 17_000, thu.id, [thu.id, hong.id]);
const sanCau = makeExpense("e-22", "Sân + nước + cầu", 305_000, nam.id, [
  thu.id,
  hong.id,
  nam.id,
]);
const bunBo = makeExpense("e-333", "Bún bò", 90_000, thu.id, [thu.id, hong.id]);
const expenses = [traTac, sanCau, bunBo];
const summary = makeSummary(participants, expenses);

const input = { code: "ABC123", name: "Cầu lông thứ 7", participants, expenses, summary };

describe("formatThousands", () => {
  it("bo duoi .000 khi tron nghin", () => {
    expect(formatThousands(90_000)).toBe("90");
  });

  it("giu mot chu so thap phan voi tien le", () => {
    expect(formatThousands(8_500)).toBe("8,5");
    expect(formatThousands(32_167)).toBe("32,2");
  });

  it("nhom hang nghin theo kieu Viet Nam", () => {
    expect(formatThousands(1_043_000)).toBe("1.043");
  });

  it("tra ve 0 khi khong co tien", () => {
    expect(formatThousands(0)).toBe("0");
  });
});

describe("buildSummaryText", () => {
  it("liet ke khoan chi theo thu tu cu nhat truoc kem so nguoi chia", () => {
    const text = buildSummaryText(input);

    expect(text).toContain("CÁC KHOẢN CHI (3 khoản · tổng 412k)");
    expect(text).toContain("1. Bún bò — 90k · 2 người = 45k · Thu, Hồng · Thu trả");
    expect(text).toContain("2. Sân + nước + cầu — 305k · 3 người = 101,7k · cả nhóm · Nam trả");
    expect(text).toContain("3. Trà tắc — 17k · 2 người = 8,5k · Thu, Hồng · Thu trả");
  });

  it("cong tung phan cua moi nguoi ra dung so phai chiu", () => {
    const text = buildSummaryText(input);

    expect(text).toContain("- Thu: 45 + 101,7 + 8,5 = 155,2k");
    expect(text).toContain("- Hồng: 45 + 101,7 + 8,5 = 155,2k");
    expect(text).toContain("- Nam: 101,7 = 101,7k");
  });

  it("chi ra ai chuyen cho ai", () => {
    const text = buildSummaryText(input);

    expect(text).toContain("CẦN CHUYỂN");
    expect(text).toContain("- Hồng → Nam: 155,2k");
    expect(text).toContain("- Thu → Nam: 48,2k");
  });

  it("them link chi tiet khi co shareUrl", () => {
    expect(buildSummaryText({ ...input, shareUrl: SHARE_URL })).toContain(
      `Chi tiết: ${SHARE_URL}`,
    );
    expect(buildSummaryText(input)).not.toContain("Chi tiết:");
  });

  it("hien 0k cho nguoi chua dinh khoan nao", () => {
    const kiet = makeParticipant("p-kiet", "Kiệt");
    const withKiet = [...participants, kiet];
    const text = buildSummaryText({
      ...input,
      participants: withKiet,
      summary: makeSummary(withKiet, expenses),
    });

    expect(text).toContain("- Kiệt: 0k");
  });

  it("gom moi nguoi ve mot dau moi o che do host", () => {
    const text = buildSummaryText({ ...input, settlementMode: "host" });

    // Nam ung 305k nen la nguoi ung nhieu nhat, thanh dau moi nhan tien.
    expect(text).toContain("GOM VỀ NAM");
    expect(text).toContain("- Hồng → Nam: 155,2k");
    expect(text).toContain("- Thu → Nam: 48,2k");
    expect(text).not.toContain("CẦN CHUYỂN");
  });

  it("ghi ro chieu tra lai khi host van no nguoi khac", () => {
    // Thu ung them 500k chia ca nhom nen thanh nguoi ung nhieu nhat, nhung Nam
    // cung da ung du phan minh nen host phai tra lai Nam.
    const bigPaidByThu = makeExpense("e-4444", "Thuê sân cả tháng", 500_000, thu.id, [
      thu.id,
      hong.id,
      nam.id,
    ]);
    const withBigExpense = [bigPaidByThu, ...expenses];

    const text = buildSummaryText({
      ...input,
      expenses: withBigExpense,
      summary: makeSummary(participants, withBigExpense),
      settlementMode: "host",
    });

    expect(text).toContain("GOM VỀ THU");
    expect(text).toContain("- Hồng → Thu: 321,8k");
    // Ca hai chieu dung cung mot dau "→" de doc cho nhat quan.
    expect(text).toContain("- Thu → Nam: 36,7k");
    expect(text).not.toContain("trả lại");
  });

  it("bo han phan chuyen tien o che do off", () => {
    const text = buildSummaryText({ ...input, settlementMode: "off" });

    expect(text).not.toContain("CẦN CHUYỂN");
    expect(text).not.toContain("GOM VỀ");
    expect(text).not.toContain("→");
    // Cac phan con lai van nguyen.
    expect(text).toContain("CÁC KHOẢN CHI");
    expect(text).toContain("- Thu: 45 + 101,7 + 8,5 = 155,2k");
  });

  it("ban chi tiet ghi ro ai da ung va ai duoc nhan lai", () => {
    const text = buildSummaryText({ ...input, settlementMode: "host" }, "detailed");

    expect(text).toContain("TỪNG NGƯỜI (phần phải chịu)");
    // Nam ung 305k, phai chiu 101,7k nen la nguoi duoc nhan lai chu khong phai tra.
    expect(text).toContain("- Nam: 101,7 = 101,7k · đã ứng 305k → nhận lại 203,3k");
    expect(text).toContain("- Hồng: 45 + 101,7 + 8,5 = 155,2k · phải trả 155,2k");
    // Thu ung 107k nhung van con thieu, phan con lai moi la so phai tra.
    expect(text).toContain("- Thu: 45 + 101,7 + 8,5 = 155,2k · phải trả 48,2k");
  });

  it("ban chi tiet tach hai chieu chuyen tien va noi ly do host tra lai", () => {
    const bigPaidByThu = makeExpense("e-4444", "Thuê sân cả tháng", 500_000, thu.id, [
      thu.id,
      hong.id,
      nam.id,
    ]);
    const withBigExpense = [bigPaidByThu, ...expenses];

    const text = buildSummaryText(
      {
        ...input,
        expenses: withBigExpense,
        summary: makeSummary(participants, withBigExpense),
        settlementMode: "host",
      },
      "detailed",
    );

    expect(text).toContain("GOM VỀ THU (Thu ứng nhiều nhất, cả nhóm quét 1 QR)");
    expect(text).toContain("Chuyển vào Thu — tổng 321,8k:");
    expect(text).toContain("- Hồng → Thu: 321,8k");
    expect(text).toContain("Thu chuyển ra:");
    expect(text).toContain("- Thu → Nam: 36,7k (Nam đã ứng 305k)");
  });

  it("ban compact khong doi gi so voi truoc", () => {
    const hostInput = { ...input, settlementMode: "host" as const };

    expect(buildSummaryText(hostInput)).toBe(buildSummaryText(hostInput, "compact"));
    expect(buildSummaryText(hostInput)).not.toContain("đã ứng");
  });

  it("bao chua co khoan chi khi danh sach rong", () => {
    const emptySummary = makeSummary(participants, []);
    const text = buildSummaryText({ ...input, expenses: [], summary: emptySummary });

    expect(text).toContain("Chưa có khoản chi nào.");
    expect(text).not.toContain("khoản · tổng");
    expect(text).toContain("- Thu: 0k");
  });
});
