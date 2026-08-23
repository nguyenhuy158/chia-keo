import { describe, expect, it } from "vitest";
import { MAX_PHOTOS_PER_GAME } from "../../../../shared/schemas";
import type { PhotoDetailRow } from "../ports/game-repository";
import { BadRequestError, InvalidInputError, NotFoundError } from "./errors";
import { createFakeRepo, FAKE_GAME_ID, FAKE_OWNER, gameRow } from "./fake-game-repository";
import {
  addGamePhoto,
  getPhotoForOwner,
  getSharedPhoto,
  listGamePhotos,
  listSharedPhotos,
  PHOTO_LIMIT_ERROR,
  removePhoto,
  updatePhoto,
} from "./photos";

const DATA_URI = "data:image/webp;base64,AAAA";

function photoInput(overrides: Partial<PhotoDetailRow> = {}) {
  return {
    expenseId: null,
    caption: "Hoá đơn",
    mimeType: "image/webp",
    width: 800,
    height: 600,
    thumbData: DATA_URI,
    data: DATA_URI,
    ...overrides,
  };
}

function photoRow(id: string, overrides: Partial<PhotoDetailRow> = {}): PhotoDetailRow {
  return {
    id,
    gameId: FAKE_GAME_ID,
    expenseId: null,
    caption: "",
    mimeType: "image/webp",
    width: 100,
    height: 100,
    thumbData: DATA_URI,
    data: DATA_URI,
    createdAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("addGamePhoto", () => {
  it("them anh va tra ve ban khong kem du lieu goc", async () => {
    const fake = createFakeRepo();

    const photo = await addGamePhoto(fake.repo, FAKE_OWNER, FAKE_GAME_ID, photoInput());

    expect(photo).toMatchObject({ caption: "Hoá đơn", width: 800 });
    // Ban tra ve cho danh sach khong duoc keo theo anh goc nang.
    expect(photo).not.toHaveProperty("data");
    expect(fake.state.photos).toHaveLength(1);
  });

  it("chan khi vuot tran anh moi cuoc", async () => {
    const photos = Array.from({ length: MAX_PHOTOS_PER_GAME }, (_, index) =>
      photoRow(`photo_${index}`),
    );
    const fake = createFakeRepo({ photos });

    await expect(
      addGamePhoto(fake.repo, FAKE_OWNER, FAKE_GAME_ID, photoInput()),
    ).rejects.toThrow(new BadRequestError(PHOTO_LIMIT_ERROR));
    expect(fake.state.photos).toHaveLength(MAX_PHOTOS_PER_GAME);
  });

  it("chi gan duoc vao khoan chi cua chinh cuoc do", async () => {
    const fake = createFakeRepo({
      expenses: [
        {
          id: "expense_cuoc_khac",
          gameId: "game_khac",
          payerParticipantId: "participant_an",
          kind: "expense",
          title: "Nước",
          amount: 1_000,
          note: "",
          splitMode: "equal",
          sequence: 0,
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
    });

    await expect(
      addGamePhoto(
        fake.repo,
        FAKE_OWNER,
        FAKE_GAME_ID,
        photoInput({ expenseId: "expense_cuoc_khac" }),
      ),
    ).rejects.toThrow(InvalidInputError);
  });

  it("khoan chi khong ton tai thi tu choi", async () => {
    const fake = createFakeRepo();

    await expect(
      addGamePhoto(fake.repo, FAKE_OWNER, FAKE_GAME_ID, photoInput({ expenseId: "expense_la" })),
    ).rejects.toThrow(InvalidInputError);
  });

  it("nguoi la khong them duoc", async () => {
    const fake = createFakeRepo();

    await expect(
      addGamePhoto(fake.repo, "user_la", FAKE_GAME_ID, photoInput()),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("listGamePhotos", () => {
  it("moi nhat truoc", async () => {
    const fake = createFakeRepo({ photos: [photoRow("photo_cu"), photoRow("photo_moi")] });

    const photos = await listGamePhotos(fake.repo, FAKE_OWNER, FAKE_GAME_ID);

    expect(photos.map((row) => row.id)).toEqual(["photo_moi", "photo_cu"]);
  });

  it("nguoi la khong xem duoc", async () => {
    const fake = createFakeRepo({ photos: [photoRow("photo_1")] });

    await expect(listGamePhotos(fake.repo, "user_la", FAKE_GAME_ID)).rejects.toThrow(NotFoundError);
  });
});

describe("getPhotoForOwner", () => {
  it("tra ve kem du lieu anh goc", async () => {
    const fake = createFakeRepo({ photos: [photoRow("photo_1")] });

    const photo = await getPhotoForOwner(fake.repo, FAKE_OWNER, "photo_1");

    expect(photo.data).toBe(DATA_URI);
  });

  it("anh khong ton tai thi bao khong tim thay", async () => {
    const fake = createFakeRepo();

    await expect(getPhotoForOwner(fake.repo, FAKE_OWNER, "photo_la")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("nguoi la khong xem duoc", async () => {
    const fake = createFakeRepo({ photos: [photoRow("photo_1")] });

    await expect(getPhotoForOwner(fake.repo, "user_la", "photo_1")).rejects.toThrow(NotFoundError);
  });
});

describe("updatePhoto", () => {
  it("doi chu thich", async () => {
    const fake = createFakeRepo({ photos: [photoRow("photo_1")] });

    const photo = await updatePhoto(fake.repo, FAKE_OWNER, "photo_1", { caption: "Sân" });

    expect(photo.caption).toBe("Sân");
  });

  it("gan anh vao khoan chi cung cuoc", async () => {
    const fake = createFakeRepo({
      photos: [photoRow("photo_1")],
      expenses: [
        {
          id: "expense_1",
          gameId: FAKE_GAME_ID,
          payerParticipantId: "participant_an",
          kind: "expense",
          title: "Nước",
          amount: 1_000,
          note: "",
          splitMode: "equal",
          sequence: 0,
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
    });

    const photo = await updatePhoto(fake.repo, FAKE_OWNER, "photo_1", { expenseId: "expense_1" });

    expect(photo.expenseId).toBe("expense_1");
  });

  it("khong gui gi thi giu nguyen", async () => {
    const fake = createFakeRepo({ photos: [photoRow("photo_1", { caption: "Cũ" })] });

    const photo = await updatePhoto(fake.repo, FAKE_OWNER, "photo_1", {});

    expect(photo.caption).toBe("Cũ");
  });

  it("nguoi la khong sua duoc", async () => {
    const fake = createFakeRepo({ photos: [photoRow("photo_1")] });

    await expect(
      updatePhoto(fake.repo, "user_la", "photo_1", { caption: "Hack" }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("removePhoto", () => {
  it("xoa anh", async () => {
    const fake = createFakeRepo({ photos: [photoRow("photo_1")] });

    expect(await removePhoto(fake.repo, FAKE_OWNER, "photo_1")).toEqual({ ok: true });
    expect(fake.state.photos).toEqual([]);
  });

  it("nguoi la khong xoa duoc", async () => {
    const fake = createFakeRepo({ photos: [photoRow("photo_1")] });

    await expect(removePhoto(fake.repo, "user_la", "photo_1")).rejects.toThrow(NotFoundError);
    expect(fake.state.photos).toHaveLength(1);
  });
});

describe("anh qua link share", () => {
  function sharedRepo(deletedAt: string | null = null) {
    return createFakeRepo({
      games: [gameRow({ deletedAt })],
      photos: [photoRow("photo_1")],
      shareLinks: [
        {
          gameId: FAKE_GAME_ID,
          token: "abcd",
          enabled: true,
          createdAt: "2026-08-01T00:00:00.000Z",
          expiresAt: null,
        },
      ],
    });
  }

  it("xem duoc danh sach anh khong can dang nhap", async () => {
    const fake = sharedRepo();

    expect(await listSharedPhotos(fake.repo, "abcd")).toHaveLength(1);
  });

  it("xem duoc mot anh kem du lieu goc", async () => {
    const fake = sharedRepo();

    expect((await getSharedPhoto(fake.repo, "abcd", "photo_1")).data).toBe(DATA_URI);
  });

  it("khong xem duoc anh cua cuoc chia khac qua token nay", async () => {
    const fake = sharedRepo();
    fake.state.photos.push(photoRow("photo_cuoc_khac", { gameId: "game_khac" }));

    await expect(getSharedPhoto(fake.repo, "abcd", "photo_cuoc_khac")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("token sai thi tu choi", async () => {
    const fake = sharedRepo();

    await expect(listSharedPhotos(fake.repo, "xxxx")).rejects.toThrow(NotFoundError);
  });

  it("cuoc chia trong thung rac thi khong xem duoc anh", async () => {
    const fake = sharedRepo("2026-08-02T00:00:00.000Z");

    await expect(listSharedPhotos(fake.repo, "abcd")).rejects.toThrow(NotFoundError);
  });
});
