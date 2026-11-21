import { describe, expect, it, vi } from "vitest";
import type { ContactBookRow } from "../../../../shared/contacts";
import {
  createContact,
  deleteContact,
  listContacts,
  updateContact,
} from "./contacts";
import { NotFoundError } from "./errors";
import { createFakeRepo } from "./fake-game-repository";

const contact: ContactBookRow = {
  id: "contact-1",
  name: "Hồng",
  bankId: "VCB",
  accountNo: "123",
  accountName: "HONG",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("contact application", () => {
  it("lists and creates a normalized personal contact", async () => {
    const { repo } = createFakeRepo();
    const list = vi
      .spyOn(repo.contacts, "listByOwner")
      .mockResolvedValue([contact]);
    const upsert = vi.spyOn(repo.contacts, "upsert");
    expect((await listContacts(repo, "owner")).contacts[0].name).toBe("Hồng");
    await createContact(repo, "owner", {
      name: "  HỒNG  ",
      bankId: "VCB",
      accountNo: "123",
      accountName: "HONG",
    });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ ownerUserId: "owner", nameKey: "hồng" }),
    );
    expect(list).toHaveBeenCalledWith("owner");
  });

  it("updates only supplied fields and rejects missing contacts", async () => {
    const { repo } = createFakeRepo();
    const get = vi.spyOn(repo.contacts, "getOwned").mockResolvedValue(contact);
    const update = vi.spyOn(repo.contacts, "update");
    await updateContact(repo, "owner", "contact-1", {
      name: " Hồng mới ",
      bankId: "ACB",
      accountNo: "456",
      accountName: "NEW",
    });
    expect(update).toHaveBeenCalledWith(
      "contact-1",
      {
        name: " Hồng mới ",
        nameKey: "hồng mới",
        bankId: "ACB",
        accountNo: "456",
        accountName: "NEW",
      },
      expect.any(String),
    );
    await updateContact(repo, "owner", "contact-1", {});
    expect(update).toHaveBeenLastCalledWith(
      "contact-1",
      {},
      expect.any(String),
    );
    get.mockResolvedValue(null);
    await expect(
      updateContact(repo, "owner", "missing", {}),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("deletes an owned contact and rejects missing contacts", async () => {
    const { repo } = createFakeRepo();
    const get = vi.spyOn(repo.contacts, "getOwned").mockResolvedValue(contact);
    const remove = vi.spyOn(repo.contacts, "delete");
    await deleteContact(repo, "owner", "contact-1");
    expect(remove).toHaveBeenCalledWith("contact-1");
    get.mockResolvedValue(null);
    await expect(
      deleteContact(repo, "owner", "missing"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

it("persists the selected default and keeps additional accounts for legacy edits", async () => {
  const { repo } = createFakeRepo();
  const accounts = [
    { bankId: "MB", accountNo: "111", accountName: "AN" },
    { bankId: "VCB", accountNo: "222", accountName: "AN" },
  ];
  const upsert = vi.spyOn(repo.contacts, "upsert");
  const update = vi.spyOn(repo.contacts, "update");
  const get = vi
    .spyOn(repo.contacts, "getOwned")
    .mockResolvedValue({ ...contact, ...accounts[0], accounts });
  await createContact(repo, "owner", {
    name: "An",
    bankId: "",
    accountNo: "",
    accountName: "",
    accounts,
  });
  expect(upsert).toHaveBeenLastCalledWith(
    expect.objectContaining({ ...accounts[0], accounts }),
  );
  await updateContact(repo, "owner", contact.id, {
    accounts: [accounts[1], accounts[0]],
  });
  expect(update).toHaveBeenLastCalledWith(
    contact.id,
    { ...accounts[1], accounts: [accounts[1], accounts[0]] },
    expect.any(String),
  );
  await updateContact(repo, "owner", contact.id, { name: "New" });
  expect(update).toHaveBeenLastCalledWith(
    contact.id,
    { name: "New", nameKey: "new" },
    expect.any(String),
  );
  for (const input of [
    { bankId: "ACB" },
    { accountNo: "333" },
    { accountName: "NEW" },
    { ...accounts[1] },
  ]) {
    await updateContact(repo, "owner", contact.id, input);
    expect(update).toHaveBeenLastCalledWith(
      contact.id,
      expect.objectContaining({ ...accounts[0], ...input }),
      expect.any(String),
    );
  }
  await updateContact(repo, "owner", contact.id, { accountNo: "" });
  expect(update).toHaveBeenLastCalledWith(
    contact.id,
    { ...accounts[1], accounts: [accounts[1]] },
    expect.any(String),
  );
  get.mockResolvedValue({
    ...contact,
    ...accounts[0],
    accounts: [accounts[0]],
  });
  await updateContact(repo, "owner", contact.id, { accountNo: "" });
  expect(update).toHaveBeenLastCalledWith(
    contact.id,
    { bankId: "", accountNo: "", accountName: "", accounts: [] },
    expect.any(String),
  );
  await updateContact(repo, "owner", contact.id, { accounts: [] });
  expect(update).toHaveBeenLastCalledWith(
    contact.id,
    { bankId: "", accountNo: "", accountName: "", accounts: [] },
    expect.any(String),
  );
});
