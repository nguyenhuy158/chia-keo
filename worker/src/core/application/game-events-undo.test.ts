import { describe, expect, it } from "vitest";
import { addExpense, removeExpense } from "./expenses";
import { InvalidInputError, NotFoundError } from "./errors";
import {
  createFakeRepo,
  FAKE_GAME_ID,
  FAKE_OWNER,
  participantRow,
  splitsOf,
} from "./fake-game-repository";
import { listGameEvents, undoGameEvent } from "./game-events";
import { removeParticipant } from "./participants";

const AN = "participant_an";
const BINH = "participant_binh";

function twoPeople() {
  return createFakeRepo({
    participants: [participantRow(AN, "An"), participantRow(BINH, "Bình", { sequence: 1 })],
  });
}

/** Them mot khoan chi roi xoa — dung trang thai ma toast "hoan tac" gap. */
async function addThenRemove(fake: ReturnType<typeof twoPeople>) {
  await addExpense(fake.repo, FAKE_OWNER, FAKE_GAME_ID, {
    kind: "expense",
    title: "Nước",
    amount: 90_000,
    note: "ghi chú",
    payerParticipantId: AN,
    splitMode: "equal",
    splitParticipantIds: [AN, BINH],
    splits: [],
  });
  await removeExpense(fake.repo, FAKE_OWNER, fake.state.expenses[0].id);

  const event = fake.state.events.find((row) => row.kind === "expense_removed");
  return event?.id || "";
}

describe("listGameEvents", () => {
  it("tra ve lich su moi nhat truoc", async () => {
    const fake = twoPeople();
    await addThenRemove(fake);

    const { events } = await listGameEvents(fake.repo, FAKE_OWNER, FAKE_GAME_ID);

    expect(events[0].payload.kind).toBe("expense_removed");
    expect(events.at(-1)?.payload.kind).toBe("expense_added");
  });

  it("bo qua dong co payload hong thay vi lam vo ca tab", async () => {
    const fake = twoPeople();
    fake.state.events.push({
      id: "event_hong",
      gameId: FAKE_GAME_ID,
      kind: "expense_added",
      payload: "{khong-phai-json",
      createdAt: "2026-08-01T00:00:00.000Z",
      undoneAt: null,
    });

    expect((await listGameEvents(fake.repo, FAKE_OWNER, FAKE_GAME_ID)).events).toEqual([]);
  });

  it("nguoi la khong xem duoc lich su", async () => {
    const fake = twoPeople();

    await expect(listGameEvents(fake.repo, "user_la", FAKE_GAME_ID)).rejects.toThrow(NotFoundError);
  });
});

describe("undoGameEvent", () => {
  it("dung lai khoan chi da xoa kem dung cac phan chia", async () => {
    const fake = twoPeople();
    const eventId = await addThenRemove(fake);

    const detail = await undoGameEvent(fake.repo, FAKE_OWNER, eventId);

    expect(detail.expenses).toHaveLength(1);
    expect(detail.expenses[0]).toMatchObject({ title: "Nước", amount: 90_000, note: "ghi chú" });
    expect(splitsOf(fake.state, fake.state.expenses[0].id)).toEqual([
      [AN, 45_000],
      [BINH, 45_000],
    ]);
  });

  it("khoan dung lai co id moi", async () => {
    const fake = twoPeople();
    const eventId = await addThenRemove(fake);

    await undoGameEvent(fake.repo, FAKE_OWNER, eventId);

    // Giu id cu se lam thu tu danh sach nhay ve giua, kho tim.
    expect(fake.state.expenses[0].id).toBeTruthy();
    expect(fake.state.events.some((row) => row.kind === "expense_restored")).toBe(true);
  });

  it("danh dau da hoan tac de khong bam duoc lan hai", async () => {
    const fake = twoPeople();
    const eventId = await addThenRemove(fake);

    await undoGameEvent(fake.repo, FAKE_OWNER, eventId);

    const event = fake.state.events.find((row) => row.id === eventId);
    expect(event?.undoneAt).not.toBeNull();
    await expect(undoGameEvent(fake.repo, FAKE_OWNER, eventId)).rejects.toThrow(InvalidInputError);
  });

  it("khong hoan tac duoc dong lich su khong phai 'da xoa khoan chi'", async () => {
    const fake = twoPeople();
    await addThenRemove(fake);
    const addedEventId =
      fake.state.events.find((row) => row.kind === "expense_added")?.id || "";

    await expect(undoGameEvent(fake.repo, FAKE_OWNER, addedEventId)).rejects.toThrow(
      InvalidInputError,
    );
  });

  it("nguoi tra da bi xoa thi tu choi ro rang", async () => {
    const fake = twoPeople();
    const eventId = await addThenRemove(fake);

    await removeParticipant(fake.repo, FAKE_OWNER, AN);

    // Dung lai se vi pham khoa ngoai; bao loi con hon de loi DB tro len.
    await expect(undoGameEvent(fake.repo, FAKE_OWNER, eventId)).rejects.toThrow(InvalidInputError);
  });

  it("mot nguoi trong danh sach chia da bi xoa thi tu choi", async () => {
    const fake = twoPeople();
    const eventId = await addThenRemove(fake);

    await removeParticipant(fake.repo, FAKE_OWNER, BINH);

    await expect(undoGameEvent(fake.repo, FAKE_OWNER, eventId)).rejects.toThrow(InvalidInputError);
  });

  it("dong lich su khong ton tai", async () => {
    const fake = twoPeople();

    await expect(undoGameEvent(fake.repo, FAKE_OWNER, "event_la")).rejects.toThrow(NotFoundError);
  });

  it("nguoi la khong hoan tac duoc", async () => {
    const fake = twoPeople();
    const eventId = await addThenRemove(fake);

    await expect(undoGameEvent(fake.repo, "user_la", eventId)).rejects.toThrow(NotFoundError);
    expect(fake.state.expenses).toEqual([]);
  });
});
