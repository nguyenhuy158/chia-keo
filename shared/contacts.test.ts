import { describe, expect, it } from "vitest";
import { buildContacts, type ContactSourceRow, normalizeContactName } from "./contacts";

function row(overrides: Partial<ContactSourceRow> & { name: string }): ContactSourceRow {
  return {
    bankId: "",
    accountNo: "",
    accountName: "",
    gameId: "game-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("normalizeContactName", () => {
  it("bo khoang trang va hoa thuong, giu dau", () => {
    expect(normalizeContactName("  Hồng  ")).toBe("hồng");
    expect(normalizeContactName("Nguyễn  Văn   A")).toBe("nguyễn văn a");
    // Bo dau se gop "Hà" voi "Ha" thanh mot nguoi — hai nguoi khac nhau.
    expect(normalizeContactName("Hà")).not.toBe(normalizeContactName("Ha"));
  });
});

describe("buildContacts", () => {
  it("gop cung mot nguoi o nhieu cuoc chia thanh mot dong", () => {
    const contacts = buildContacts([
      row({ name: "Hồng", gameId: "g1" }),
      row({ name: "hồng ", gameId: "g2", createdAt: "2026-02-01T00:00:00.000Z" }),
      row({ name: "Kiệt", gameId: "g1" }),
    ]);

    expect(contacts.map((contact) => contact.name)).toEqual(["Hồng", "Kiệt"]);
    expect(contacts[0].gameCount).toBe(2);
    expect(contacts[0].lastUsedAt).toBe("2026-02-01T00:00:00.000Z");
  });

  it("cung mot nguoi trong cung mot cuoc chia chi tinh la mot lan", () => {
    const contacts = buildContacts([
      row({ name: "Huy", gameId: "g1" }),
      row({ name: "Huy", gameId: "g1", createdAt: "2026-01-02T00:00:00.000Z" }),
    ]);

    expect(contacts[0].gameCount).toBe(1);
  });

  it("giu so tai khoan da biet khi lan sau bo trong", () => {
    const contacts = buildContacts([
      row({
        name: "Hồng",
        gameId: "g1",
        bankId: "VCB",
        accountNo: "0123",
        accountName: "NGUYEN THI HONG",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
      row({ name: "Hồng", gameId: "g2", createdAt: "2026-03-01T00:00:00.000Z" }),
    ]);

    expect(contacts[0]).toMatchObject({ bankId: "VCB", accountNo: "0123" });
  });

  it("so tai khoan moi ghi de so cu", () => {
    const contacts = buildContacts([
      row({ name: "Hồng", gameId: "g1", bankId: "VCB", accountNo: "0123" }),
      row({
        name: "Hồng",
        gameId: "g2",
        bankId: "TCB",
        accountNo: "9999",
        createdAt: "2026-03-01T00:00:00.000Z",
      }),
    ]);

    expect(contacts[0]).toMatchObject({ bankId: "TCB", accountNo: "9999" });
  });

  it("bo ten mac dinh cua che do tao nhanh", () => {
    const contacts = buildContacts([
      row({ name: "Người 1" }),
      row({ name: "người 12" }),
      row({ name: "Người mới" }),
      row({ name: "  " }),
    ]);

    // "Người mới" la ten that nen duoc giu, chi bo "Người <so>".
    expect(contacts.map((contact) => contact.name)).toEqual(["Người mới"]);
  });

  it("nguoi hay di cung len truoc, cung so lan thi nguoi moi nhat truoc", () => {
    const contacts = buildContacts([
      row({ name: "Hay", gameId: "g1" }),
      row({ name: "Hay", gameId: "g2" }),
      row({ name: "Cu", gameId: "g1", createdAt: "2026-01-01T00:00:00.000Z" }),
      row({ name: "Moi", gameId: "g2", createdAt: "2026-05-01T00:00:00.000Z" }),
    ]);

    expect(contacts.map((contact) => contact.name)).toEqual(["Hay", "Moi", "Cu"]);
  });

  it("khong co ai thi tra danh sach rong", () => {
    expect(buildContacts([])).toEqual([]);
  });
});
