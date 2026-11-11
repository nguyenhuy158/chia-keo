import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BankFeed, IncomingTransfer } from "../ports/bank-feed";
import { InvalidInputError, NotFoundError } from "./errors";
import { addExpense } from "./expenses";
import {
  createFakeRepo,
  FAKE_GAME_ID,
  FAKE_OWNER,
  gameRow,
  participantRow,
} from "./fake-game-repository";
import {
  createPaymentRequest,
  getPaymentOptions,
  getPaymentRequest,
  reconcileSharedPayments,
} from "./payments";

const HUY = "participant_huy";
const AN = "participant_an";
const BINH = "participant_binh";
const TOKEN = "tok1";
const HUY_ACCOUNT = "0123456789";

function setup() {
  const fake = createFakeRepo({
    games: [gameRow({ settlementMode: "pick", settlementHostId: HUY })],
    participants: [
      participantRow(HUY, "Huy", { sequence: 0 }),
      participantRow(AN, "An", { sequence: 1 }),
      participantRow(BINH, "Bình", { sequence: 2 }),
    ],
    payments: [
      {
        participantId: HUY,
        bankId: "MB",
        accountNo: HUY_ACCOUNT,
        accountName: "HUY",
      },
    ],
    shareLinks: [
      {
        gameId: FAKE_GAME_ID,
        token: TOKEN,
        enabled: true,
        createdAt: "2026-08-01",
        expiresAt: null,
      },
    ],
  });
  const transfers: IncomingTransfer[] = [];
  const bankFeed: BankFeed = {
    listAccountNumbers: async () => [HUY_ACCOUNT],
    listIncomingSince: async () => transfers,
  };
  return { fake, transfers, context: { repo: fake.repo, bankFeed } };
}

function incoming(
  code: string,
  amount: number,
  id = `txn-${code}`,
): IncomingTransfer {
  return {
    id,
    accountNo: HUY_ACCOUNT,
    amount,
    content: `MBVCB.123.${code.toLowerCase()} chuyen tien`,
  };
}

function allowRecheck(fake: ReturnType<typeof setup>["fake"]) {
  for (const row of fake.state.paymentRequests)
    row.checkedAt = new Date(0).toISOString();
}

describe("thanh toan qua link share", () => {
  let env: ReturnType<typeof setup>;

  beforeEach(async () => {
    env = setup();
    await addExpense(env.fake.repo, FAKE_OWNER, FAKE_GAME_ID, {
      kind: "expense",
      category: "",
      title: "Sân",
      amount: 300_000,
      note: "",
      payerParticipantId: HUY,
      splitMode: "equal",
      splitParticipantIds: [HUY, AN, BINH],
      splits: [],
    });
  });

  it("liet ke nguoi dang no chu tai khoan SePay", async () => {
    const options = await getPaymentOptions(env.context, TOKEN);
    expect(options.receiver?.id).toBe(HUY);
    expect(options.options).toEqual([
      { participantId: AN, amount: 100_000 },
      { participantId: BINH, amount: 100_000 },
    ]);
  });

  it("khong co SePay thi tat thanh toan", async () => {
    const options = await getPaymentOptions(
      { repo: env.fake.repo, bankFeed: null },
      TOKEN,
    );
    expect(options).toEqual({ receiver: null, options: [] });
  });

  it("tu choi nguoi khong no", async () => {
    await expect(
      createPaymentRequest(env.context, TOKEN, { participantIds: [HUY] }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("nhan du tien thi ghi tra no cho tung nguoi, chi mot lan", async () => {
    const request = await createPaymentRequest(env.context, TOKEN, {
      participantIds: [AN, BINH],
    });
    expect(request.total).toBe(200_000);
    expect(request.code).toMatch(/^CK[A-Z0-9]{8}$/);

    env.transfers.push(incoming(request.code, 200_000));
    const paid = await getPaymentRequest(env.context, TOKEN, request.code);
    expect(paid.status).toBe("paid");

    allowRecheck(env.fake);
    await getPaymentOptions(env.context, TOKEN);
    const transfers = env.fake.state.expenses.filter(
      (row) => row.kind === "transfer",
    );
    expect(
      transfers.map((row) => [row.payerParticipantId, row.amount]),
    ).toEqual([
      [AN, 100_000],
      [BINH, 100_000],
    ]);
    expect((await getPaymentOptions(env.context, TOKEN)).options).toEqual([]);
  });

  it("mot giao dich chi khop mot request", async () => {
    const first = await createPaymentRequest(env.context, TOKEN, {
      participantIds: [AN],
    });
    const second = await createPaymentRequest(env.context, TOKEN, {
      participantIds: [BINH],
    });
    env.transfers.push(incoming(first.code, 100_000));
    env.transfers.push({
      ...incoming(second.code, 100_000),
      id: `txn-${first.code}`,
    });

    await getPaymentRequest(env.context, TOKEN, first.code);
    allowRecheck(env.fake);
    expect(
      (await getPaymentRequest(env.context, TOKEN, second.code)).status,
    ).toBe("pending");
  });

  it("chuyen thieu thi van cho, cong don den khi du moi ghi tra no", async () => {
    const request = await createPaymentRequest(env.context, TOKEN, {
      participantIds: [AN],
    });
    env.transfers.push(incoming(request.code, 1));
    const first = await getPaymentRequest(env.context, TOKEN, request.code);
    expect(first).toMatchObject({ status: "pending", paidAmount: 1 });
    expect(env.fake.state.expenses.some((row) => row.kind === "transfer")).toBe(
      false,
    );

    allowRecheck(env.fake);
    const again = await getPaymentRequest(env.context, TOKEN, request.code);
    expect(again.paidAmount).toBe(1);

    env.transfers.push(incoming(request.code, 99_999, "txn-rest"));
    allowRecheck(env.fake);
    expect(
      await getPaymentRequest(env.context, TOKEN, request.code),
    ).toMatchObject({
      status: "paid",
      paidAmount: 100_000,
    });
    expect(
      env.fake.state.expenses.filter((row) => row.kind === "transfer"),
    ).toHaveLength(1);
  });

  it("lan doi soat khac da chot truoc thi khong ghi tra no lan nua", async () => {
    const request = await createPaymentRequest(env.context, TOKEN, {
      participantIds: [AN],
    });
    env.transfers.push(incoming(request.code, 100_000));
    env.fake.repo.paymentRequests.markPaid = async () => false;
    await getPaymentRequest(env.context, TOKEN, request.code);
    expect(env.fake.state.expenses.some((row) => row.kind === "transfer")).toBe(
      false,
    );
  });

  it("tao lai cung lua chon thi dung lai ma cu", async () => {
    const first = await createPaymentRequest(env.context, TOKEN, {
      participantIds: [AN, BINH],
    });
    const again = await createPaymentRequest(env.context, TOKEN, {
      participantIds: [BINH, AN],
    });
    expect(again.code).toBe(first.code);

    const huy = env.fake.state.payments.find(
      (row) => row.participantId === HUY,
    );
    if (huy) huy.accountNo = "9876543210";
    env.context.bankFeed.listAccountNumbers = async () => ["9876543210"];
    const moved = await createPaymentRequest(env.context, TOKEN, {
      participantIds: [AN, BINH],
    });
    expect(moved.code).not.toBe(first.code);
    expect(env.fake.state.paymentRequests.at(-1)?.receiverAccountNo).toBe(
      "9876543210",
    );
  });

  it("loi SePay khi doi soat khong lam hong trang", async () => {
    await createPaymentRequest(env.context, TOKEN, { participantIds: [AN] });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const failing = {
      ...env.context.bankFeed,
      listIncomingSince: async () => {
        throw new Error("down");
      },
    };
    const options = await getPaymentOptions(
      { repo: env.fake.repo, bankFeed: failing },
      TOKEN,
    );
    expect(options.receiver?.id).toBe(HUY);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("bao loi khi khong sinh duoc ma khong trung", async () => {
    const first = await createPaymentRequest(env.context, TOKEN, {
      participantIds: [AN],
    });
    const taken = env.fake.state.paymentRequests.find(
      (row) => row.code === first.code,
    );
    env.fake.repo.paymentRequests.findByCode = async () => taken || null;
    await expect(
      createPaymentRequest(env.context, TOKEN, { participantIds: [BINH] }),
    ).rejects.toThrow();
  });

  it("ma cua cuoc khac thi khong tim thay", async () => {
    await expect(
      getPaymentRequest(env.context, TOKEN, "CKNOPE1234"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("doi soat toi da moi 5 giay, request da xong thi khong goi SePay", async () => {
    const request = await createPaymentRequest(env.context, TOKEN, {
      participantIds: [AN],
    });
    const listIncomingSince = vi.fn(async () => [
      incoming(request.code, 100_000),
    ]);
    const context = {
      repo: env.fake.repo,
      bankFeed: { ...env.context.bankFeed, listIncomingSince },
    };

    env.fake.state.paymentRequests[0].checkedAt = new Date().toISOString();
    expect((await getPaymentRequest(context, TOKEN, request.code)).status).toBe(
      "pending",
    );
    expect(listIncomingSince).not.toHaveBeenCalled();

    allowRecheck(env.fake);
    expect((await getPaymentRequest(context, TOKEN, request.code)).status).toBe(
      "paid",
    );
    expect((await getPaymentRequest(context, TOKEN, request.code)).status).toBe(
      "paid",
    );
    expect(listIncomingSince).toHaveBeenCalledTimes(1);
  });

  it("khong co SePay thi khong tao duoc request", async () => {
    await expect(
      createPaymentRequest({ repo: env.fake.repo, bankFeed: null }, TOKEN, {
        participantIds: [AN],
      }),
    ).rejects.toBeInstanceOf(InvalidInputError);
  });

  it("nguoi nhan bi xoa thi request khong con hop le", async () => {
    const request = await createPaymentRequest(env.context, TOKEN, {
      participantIds: [AN],
    });
    env.fake.state.participants = env.fake.state.participants.filter(
      (row) => row.id !== HUY,
    );
    await expect(
      getPaymentRequest(env.context, TOKEN, request.code),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("doi soat theo token share cho trang host", async () => {
    const request = await createPaymentRequest(env.context, TOKEN, {
      participantIds: [AN],
    });
    env.transfers.push(incoming(request.code, 100_000));
    await reconcileSharedPayments(env.context, TOKEN);
    expect(env.fake.state.paymentRequests[0].status).toBe("paid");
  });
});
