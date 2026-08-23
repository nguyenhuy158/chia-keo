import { describe, expect, it } from "vitest";
import { InvalidInputError, NotFoundError } from "./errors";
import {
  createFakeRepo,
  FAKE_GAME_ID,
  FAKE_OWNER,
  gameRow,
  participantRow,
} from "./fake-game-repository";
import {
  addParticipant,
  addParticipants,
  removeParticipant,
  reorderParticipants,
  updateParticipant,
} from "./participants";

const AN = "participant_an";
const BINH = "participant_binh";

function participantInput(name: string) {
  return { name, bankId: "970436", accountNo: "0123456789", accountName: name.toUpperCase() };
}

describe("addParticipant", () => {
  it("them nguoi kem tai khoan nhan tien va ghi lich su", async () => {
    const fake = createFakeRepo();

    const detail = await addParticipant(
      fake.repo,
      FAKE_OWNER,
      FAKE_GAME_ID,
      participantInput("An"),
    );

    expect(detail.participants).toHaveLength(1);
    expect(detail.participants[0]).toMatchObject({ name: "An", bankId: "970436" });
    expect(fake.state.events[0].kind).toBe("participant_added");
  });

  it("nguoi la khong them duoc", async () => {
    const fake = createFakeRepo();

    await expect(
      addParticipant(fake.repo, "user_la", FAKE_GAME_ID, participantInput("An")),
    ).rejects.toThrow(NotFoundError);
    expect(fake.state.participants).toEqual([]);
  });

  it("cuoc chia trong thung rac thi khong them duoc", async () => {
    const fake = createFakeRepo({ games: [gameRow({ deletedAt: "2026-08-02T00:00:00.000Z" })] });

    await expect(
      addParticipant(fake.repo, FAKE_OWNER, FAKE_GAME_ID, participantInput("An")),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("addParticipants", () => {
  it("them nhieu nguoi mot luot, giu thu tu nhap", async () => {
    const fake = createFakeRepo();

    const detail = await addParticipants(fake.repo, FAKE_OWNER, FAKE_GAME_ID, {
      people: [participantInput("An"), participantInput("Bình"), participantInput("Cường")],
    });

    expect(detail.participants.map((row) => row.name)).toEqual(["An", "Bình", "Cường"]);
    // Mot dong lich su cho ca luot, khong phai ba dong.
    expect(fake.state.events).toHaveLength(1);
  });
});

describe("updateParticipant", () => {
  it("doi ten ghi lich su participant_renamed", async () => {
    const fake = createFakeRepo({ participants: [participantRow(AN, "An")] });

    const detail = await updateParticipant(fake.repo, FAKE_OWNER, AN, { name: "An Anh" });

    expect(detail.participants[0].name).toBe("An Anh");
    expect(fake.state.events[0].kind).toBe("participant_renamed");
  });

  it("ten khong doi thi khong ghi lich su", async () => {
    const fake = createFakeRepo({ participants: [participantRow(AN, "An")] });

    await updateParticipant(fake.repo, FAKE_OWNER, AN, { name: "An" });

    expect(fake.state.events).toEqual([]);
  });

  it("chi sua tai khoan thi giu nguyen ten", async () => {
    const fake = createFakeRepo({ participants: [participantRow(AN, "An")] });

    const detail = await updateParticipant(fake.repo, FAKE_OWNER, AN, { accountNo: "999" });

    expect(detail.participants[0]).toMatchObject({ name: "An", accountNo: "999" });
  });

  it("nguoi la khong sua duoc", async () => {
    const fake = createFakeRepo({ participants: [participantRow(AN, "An")] });

    await expect(
      updateParticipant(fake.repo, "user_la", AN, { name: "Hack" }),
    ).rejects.toThrow(NotFoundError);
    expect(fake.state.participants[0].name).toBe("An");
  });
});

describe("removeParticipant", () => {
  it("xoa nguoi va ghi lich su", async () => {
    const fake = createFakeRepo({
      participants: [participantRow(AN, "An"), participantRow(BINH, "Bình", { sequence: 1 })],
    });

    const detail = await removeParticipant(fake.repo, FAKE_OWNER, AN);

    expect(detail.participants.map((row) => row.id)).toEqual([BINH]);
    expect(fake.state.events[0].kind).toBe("participant_removed");
  });

  it("nguoi la khong xoa duoc", async () => {
    const fake = createFakeRepo({ participants: [participantRow(AN, "An")] });

    await expect(removeParticipant(fake.repo, "user_la", AN)).rejects.toThrow(NotFoundError);
    expect(fake.state.participants).toHaveLength(1);
  });
});

describe("reorderParticipants", () => {
  it("sap lai thu tu hien thi", async () => {
    const fake = createFakeRepo({
      participants: [participantRow(AN, "An"), participantRow(BINH, "Bình", { sequence: 1 })],
    });

    const detail = await reorderParticipants(fake.repo, FAKE_OWNER, FAKE_GAME_ID, [BINH, AN]);

    expect(detail.participants.map((row) => row.id)).toEqual([BINH, AN]);
  });

  it("tu choi danh sach trung id hoac co id la", async () => {
    const fake = createFakeRepo({ participants: [participantRow(AN, "An")] });

    await expect(
      reorderParticipants(fake.repo, FAKE_OWNER, FAKE_GAME_ID, [AN, AN]),
    ).rejects.toThrow(InvalidInputError);
    await expect(
      reorderParticipants(fake.repo, FAKE_OWNER, FAKE_GAME_ID, ["participant_la"]),
    ).rejects.toThrow(InvalidInputError);
  });
});
