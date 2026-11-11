import type {
  ApiParticipant,
  ApiPaymentOptions,
  ApiPaymentRequest,
} from "../../../../shared/api-types";
import {
  listDueTransfers,
  PAYMENT_CODE_PREFIX,
  PAYMENT_CODE_SUFFIX_LENGTH,
  type PaymentItem,
  type PaymentStatus,
  samePaymentItems,
  sumPaymentItems,
} from "../../../../shared/payments";
import type { PaymentRequestInput } from "../../../../shared/schemas";
import { createId, createPaymentCode, nowIso } from "../../lib/ids";
import type { BankFeed, IncomingTransfer } from "../ports/bank-feed";
import type {
  GameRepository,
  GameRow,
  PaymentRequestRow,
} from "../ports/game-repository";
import { InvalidInputError, NotFoundError } from "./errors";
import { insertTransfer } from "./expenses";
import { loadShareView } from "./game-detail";
import { getSharedGame } from "./share-links";

export const PAYMENT_REQUEST_TTL_MS = 24 * 60 * 60_000;
export const BANK_CHECK_INTERVAL_MS = 3_000;
const BANK_LOOKBACK_MS = 60_000;
const PAYMENT_CODE_RETRY_LIMIT = 5;
const PAYMENT_TRANSFER_NOTE_PREFIX = "SePay";

export type PaymentContext = {
  repo: GameRepository;
  bankFeed: BankFeed | null;
};

function normalizeContent(content: string) {
  return content.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function parseItems(row: PaymentRequestRow): PaymentItem[] {
  return JSON.parse(row.itemsJson) as PaymentItem[];
}

function msAgo(ms: number) {
  return new Date(Date.now() - ms).toISOString();
}

async function loadPaymentOptions(
  { repo, bankFeed }: PaymentContext,
  game: GameRow,
): Promise<ApiPaymentOptions> {
  const view = await loadShareView(repo, game);
  const empty: ApiPaymentOptions = { receiver: null, options: [] };
  if (!bankFeed || view.closedAt) return empty;

  const accountNumbers = new Set(await bankFeed.listAccountNumbers());
  const byId = new Map(view.participants.map((person) => [person.id, person]));
  const due = listDueTransfers(
    view.summary,
    view.settlementMode,
    view.settlementHostId,
  );
  const receiver = due
    .map((row) => byId.get(row.toParticipantId))
    .find((person) => person && accountNumbers.has(person.accountNo.trim()));
  if (!receiver) return empty;

  return {
    receiver,
    options: due
      .filter((row) => row.toParticipantId === receiver.id)
      .map((row) => ({
        participantId: row.fromParticipantId,
        amount: row.amount,
      })),
  };
}

function toApiRequest(
  row: PaymentRequestRow,
  receiver: ApiParticipant,
): ApiPaymentRequest {
  return {
    code: row.code,
    receiver,
    items: parseItems(row),
    total: row.total,
    status: row.status as PaymentStatus,
    paidAmount: row.paidAmount,
  };
}

function isTransferFor(request: PaymentRequestRow, transfer: IncomingTransfer) {
  return (
    transfer.accountNo.trim() === request.receiverAccountNo &&
    normalizeContent(transfer.content).includes(request.code)
  );
}

async function recordDebtPayments(
  repo: GameRepository,
  request: PaymentRequestRow,
) {
  for (const item of parseItems(request)) {
    await insertTransfer(repo, request.gameId, {
      fromParticipantId: item.participantId,
      toParticipantId: request.receiverParticipantId,
      amount: item.amount,
      note: `${PAYMENT_TRANSFER_NOTE_PREFIX} ${request.code}`,
    });
  }
}

async function applyTransfers(
  repo: GameRepository,
  request: PaymentRequestRow,
  transfers: IncomingTransfer[],
) {
  let paidAmount = request.paidAmount;
  for (const transfer of transfers.filter((item) =>
    isTransferFor(request, item),
  )) {
    const claimed = await repo.paymentRequests.claimTransaction({
      bankTxnId: transfer.id,
      requestId: request.id,
      amount: transfer.amount,
      createdAt: nowIso(),
    });
    if (claimed)
      paidAmount = await repo.paymentRequests.addPaidAmount(
        request.id,
        transfer.amount,
      );
  }
  if (paidAmount < request.total) return;
  if (await repo.paymentRequests.markPaid(request.id, nowIso())) {
    await recordDebtPayments(repo, request);
  }
}

async function reconcileGamePayments(
  { repo, bankFeed }: PaymentContext,
  gameId: string,
) {
  if (!bankFeed) return;
  const pending = await repo.paymentRequests.listPendingByGame(
    gameId,
    msAgo(PAYMENT_REQUEST_TTL_MS),
  );
  if (pending.length === 0) return;

  const recentlyChecked = msAgo(BANK_CHECK_INTERVAL_MS);
  if (pending.some((request) => request.checkedAt > recentlyChecked)) return;
  await repo.paymentRequests.markChecked(
    pending.map((request) => request.id),
    nowIso(),
  );

  const oldest = pending[0].createdAt;
  const transfers = await bankFeed.listIncomingSince(
    new Date(Date.parse(oldest) - BANK_LOOKBACK_MS).toISOString(),
  );
  for (const request of pending) await applyTransfers(repo, request, transfers);
}

export async function reconcilePaymentsSafely(
  context: PaymentContext,
  gameId: string,
) {
  try {
    await reconcileGamePayments(context, gameId);
  } catch (error) {
    console.error("SePay reconcile failed:", error);
  }
}

export async function reconcileSharedPayments(
  context: PaymentContext,
  token: string,
) {
  const game = await getSharedGame(context.repo, token);
  await reconcilePaymentsSafely(context, game.id);
}

export async function getPaymentOptions(
  context: PaymentContext,
  token: string,
): Promise<ApiPaymentOptions> {
  const game = await getSharedGame(context.repo, token);
  await reconcilePaymentsSafely(context, game.id);
  return loadPaymentOptions(context, game);
}

async function createUniquePaymentCode(repo: GameRepository) {
  for (let attempt = 0; attempt < PAYMENT_CODE_RETRY_LIMIT; attempt += 1) {
    const code = createPaymentCode(
      PAYMENT_CODE_PREFIX,
      PAYMENT_CODE_SUFFIX_LENGTH,
    );
    if (!(await repo.paymentRequests.findByCode(code))) return code;
  }
  throw new Error("Khong tao duoc ma thanh toan khong trung");
}

export async function createPaymentRequest(
  context: PaymentContext,
  token: string,
  input: PaymentRequestInput,
): Promise<ApiPaymentRequest> {
  const { repo } = context;
  const game = await getSharedGame(repo, token);
  const { receiver, options } = await loadPaymentOptions(context, game);
  if (!receiver) throw new InvalidInputError();

  const optionById = new Map(
    options.map((option) => [option.participantId, option]),
  );
  const selectedIds = [...new Set(input.participantIds)];
  const items = selectedIds.map((id) => optionById.get(id));
  if (items.some((item) => !item)) throw new InvalidInputError();
  const paymentItems = items as PaymentItem[];

  const pending = await repo.paymentRequests.listPendingByGame(
    game.id,
    msAgo(PAYMENT_REQUEST_TTL_MS),
  );
  const reusable = pending.find(
    (request) =>
      request.receiverParticipantId === receiver.id &&
      request.receiverAccountNo === receiver.accountNo.trim() &&
      samePaymentItems(parseItems(request), paymentItems),
  );
  if (reusable) return toApiRequest(reusable, receiver);

  const now = nowIso();
  const row: PaymentRequestRow = {
    id: createId("payreq"),
    gameId: game.id,
    code: await createUniquePaymentCode(repo),
    receiverParticipantId: receiver.id,
    receiverAccountNo: receiver.accountNo.trim(),
    itemsJson: JSON.stringify(paymentItems),
    total: sumPaymentItems(paymentItems),
    status: "pending",
    paidAmount: 0,
    createdAt: now,
    checkedAt: new Date(0).toISOString(),
    paidAt: null,
  };
  await repo.paymentRequests.insert(row);
  return toApiRequest(row, receiver);
}

export async function getPaymentRequest(
  context: PaymentContext,
  token: string,
  code: string,
): Promise<ApiPaymentRequest> {
  const { repo } = context;
  const game = await getSharedGame(repo, token);
  const found = await repo.paymentRequests.findByCode(code);
  if (!found || found.gameId !== game.id) throw new NotFoundError();

  if (found.status === "pending")
    await reconcilePaymentsSafely(context, game.id);
  const row = (await repo.paymentRequests.findByCode(
    code,
  )) as PaymentRequestRow;
  const view = await loadShareView(repo, game);
  const receiver = view.participants.find(
    (person) => person.id === row.receiverParticipantId,
  );
  if (!receiver) throw new NotFoundError();
  return toApiRequest(row, receiver);
}
