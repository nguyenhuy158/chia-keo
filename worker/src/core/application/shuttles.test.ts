import { describe, expect, it } from "vitest";
import {
  createShuttleEntry,
  deleteShuttleEntry,
  getShuttleStock,
} from "./shuttles";
import { FAKE_OWNER, createFakeRepo } from "./fake-game-repository";

describe("kho cau", () => {
  it("kho trong khi chua ghi gi", async () => {
    const { repo } = createFakeRepo();
    expect(await getShuttleStock(repo, FAKE_OWNER)).toEqual({ stock: 0, entries: [] });
  });

  it("mua them roi dung dan: kho la tong cac thao tac", async () => {
    const { repo } = createFakeRepo();

    await createShuttleEntry(repo, FAKE_OWNER, { kind: "add", quantity: 12 });
    await createShuttleEntry(repo, FAKE_OWNER, { kind: "use", quantity: 3 });
    const view = await createShuttleEntry(repo, FAKE_OWNER, { kind: "use", quantity: 2 });

    expect(view.stock).toBe(7);
    // Moi nhat truoc, kem so cau con lai ngay sau tung thao tac.
    expect(view.entries.map((entry) => [entry.delta, entry.stockAfter])).toEqual([
      [-2, 7],
      [-3, 9],
      [12, 12],
    ]);
  });

  it("chot lai so cau dem duoc trong ong, khong can biet da dung bao nhieu", async () => {
    const { repo } = createFakeRepo();
    await createShuttleEntry(repo, FAKE_OWNER, { kind: "add", quantity: 12 });

    const view = await createShuttleEntry(repo, FAKE_OWNER, { kind: "set", quantity: 5 });

    expect(view.stock).toBe(5);
    expect(view.entries[0]?.delta).toBe(-7);
  });

  it("chot lai dung so dang co thi khong ghi them dong nao", async () => {
    const { repo, state } = createFakeRepo();
    await createShuttleEntry(repo, FAKE_OWNER, { kind: "add", quantity: 4 });

    const view = await createShuttleEntry(repo, FAKE_OWNER, { kind: "set", quantity: 4 });

    expect(view.stock).toBe(4);
    expect(state.shuttleEntries).toHaveLength(1);
  });

  it("khong cho dung nhieu hon so cau dang co", async () => {
    const { repo } = createFakeRepo();
    await createShuttleEntry(repo, FAKE_OWNER, { kind: "add", quantity: 2 });

    await expect(
      createShuttleEntry(repo, FAKE_OWNER, { kind: "use", quantity: 3 }),
    ).rejects.toThrow("shuttle_stock_negative");
  });

  it("xoa mot lan bam sai thi kho tinh lai theo cac dong con lai", async () => {
    const { repo } = createFakeRepo();
    await createShuttleEntry(repo, FAKE_OWNER, { kind: "add", quantity: 12 });
    const withMistake = await createShuttleEntry(repo, FAKE_OWNER, { kind: "use", quantity: 5 });

    const view = await deleteShuttleEntry(repo, FAKE_OWNER, withMistake.entries[0]!.id);

    expect(view.stock).toBe(12);
    expect(view.entries).toHaveLength(1);
  });

  it("khong xoa dong lam kho thanh am", async () => {
    const { repo } = createFakeRepo();
    const added = await createShuttleEntry(repo, FAKE_OWNER, { kind: "add", quantity: 12 });
    await createShuttleEntry(repo, FAKE_OWNER, { kind: "use", quantity: 3 });

    await expect(
      deleteShuttleEntry(repo, FAKE_OWNER, added.entries[0]!.id),
    ).rejects.toThrow("shuttle_stock_negative");
  });

  it("khong xoa duoc dong cua nguoi khac", async () => {
    const { repo } = createFakeRepo();
    const view = await createShuttleEntry(repo, FAKE_OWNER, { kind: "add", quantity: 6 });

    await expect(
      deleteShuttleEntry(repo, "user_khac", view.entries[0]!.id),
    ).rejects.toThrow("not_found");
  });
});
