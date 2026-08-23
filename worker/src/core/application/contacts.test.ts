import { describe, expect, it } from "vitest";
import { normalizeContactName } from "../../../../shared/contacts";
import { createContact, deleteContact, listContacts, updateContact } from "./contacts";
import { NotFoundError } from "./errors";
import { createFakeRepo, FAKE_OWNER, participantRow } from "./fake-game-repository";

function contactInput(name: string) {
  return { name, bankId: "970436", accountNo: "0123456789", accountName: name.toUpperCase() };
}

describe("listContacts", () => {
  it("gop danh ba tu nhap voi nguoi suy ra tu cac cuoc chia da tao", async () => {
    const fake = createFakeRepo({ participants: [participantRow("participant_an", "An")] });
    await createContact(fake.repo, FAKE_OWNER, contactInput("Bình"));

    const { contacts } = await listContacts(fake.repo, FAKE_OWNER);

    expect(contacts.map((row) => row.name).sort()).toEqual(["An", "Bình"]);
  });

  it("khong tra ve danh ba cua nguoi khac", async () => {
    const fake = createFakeRepo();
    await createContact(fake.repo, FAKE_OWNER, contactInput("Bình"));

    expect((await listContacts(fake.repo, "user_la")).contacts).toEqual([]);
  });
});

describe("createContact", () => {
  it("them moi vao danh ba", async () => {
    const fake = createFakeRepo();

    const { contacts } = await createContact(fake.repo, FAKE_OWNER, contactInput("Hồng"));

    expect(contacts).toHaveLength(1);
    expect(contacts[0]).toMatchObject({ name: "Hồng", accountNo: "0123456789" });
  });

  it("go lai cung ten thi sua dong cu, khong tao dong thu hai", async () => {
    const fake = createFakeRepo();
    await createContact(fake.repo, FAKE_OWNER, contactInput("Hồng"));

    const { contacts } = await createContact(fake.repo, FAKE_OWNER, {
      ...contactInput("Hồng"),
      accountNo: "999",
    });

    // Hai dong "Hong" trong danh ba thi khong ai biet chon dong nao.
    expect(contacts).toHaveLength(1);
    expect(contacts[0].accountNo).toBe("999");
  });

  it("nameKey chuan hoa bo dau va hoa thuong", async () => {
    const fake = createFakeRepo();

    await createContact(fake.repo, FAKE_OWNER, contactInput("Hồng"));

    expect(fake.state.contacts[0].nameKey).toBe(normalizeContactName("Hồng"));
  });
});

describe("updateContact", () => {
  it("doi ten va tai khoan", async () => {
    const fake = createFakeRepo();
    await createContact(fake.repo, FAKE_OWNER, contactInput("Hồng"));
    const contactId = fake.state.contacts[0].id;

    const { contacts } = await updateContact(fake.repo, FAKE_OWNER, contactId, {
      name: "Hồng Anh",
      accountNo: "555",
    });

    expect(contacts[0]).toMatchObject({ name: "Hồng Anh", accountNo: "555" });
  });

  it("doi ten thi nameKey cung doi theo", async () => {
    const fake = createFakeRepo();
    await createContact(fake.repo, FAKE_OWNER, contactInput("Hồng"));
    const contactId = fake.state.contacts[0].id;

    await updateContact(fake.repo, FAKE_OWNER, contactId, { name: "Lan" });

    expect(fake.state.contacts[0].nameKey).toBe(normalizeContactName("Lan"));
  });

  it("chi doi ngan hang thi cac truong khac giu nguyen", async () => {
    const fake = createFakeRepo();
    await createContact(fake.repo, FAKE_OWNER, contactInput("Hồng"));
    const contactId = fake.state.contacts[0].id;

    const { contacts } = await updateContact(fake.repo, FAKE_OWNER, contactId, {
      bankId: "970422",
    });

    expect(contacts[0]).toMatchObject({ name: "Hồng", bankId: "970422", accountNo: "0123456789" });
  });

  it("khong sua duoc danh ba cua nguoi khac", async () => {
    const fake = createFakeRepo();
    await createContact(fake.repo, FAKE_OWNER, contactInput("Hồng"));
    const contactId = fake.state.contacts[0].id;

    await expect(
      updateContact(fake.repo, "user_la", contactId, { name: "Hack" }),
    ).rejects.toThrow(NotFoundError);
    expect(fake.state.contacts[0].name).toBe("Hồng");
  });
});

describe("deleteContact", () => {
  it("xoa khoi danh ba", async () => {
    const fake = createFakeRepo();
    await createContact(fake.repo, FAKE_OWNER, contactInput("Hồng"));
    const contactId = fake.state.contacts[0].id;

    expect((await deleteContact(fake.repo, FAKE_OWNER, contactId)).contacts).toEqual([]);
  });

  it("nguoi da tung di cung van hien lai tu lich su cuoc chia", async () => {
    const fake = createFakeRepo({ participants: [participantRow("participant_an", "An")] });
    await createContact(fake.repo, FAKE_OWNER, contactInput("An"));
    const contactId = fake.state.contacts[0].id;

    const { contacts } = await deleteContact(fake.repo, FAKE_OWNER, contactId);

    // Xoa khoi danh ba khong dong nghia xoa khoi cac cuoc chia da co.
    expect(contacts.map((row) => row.name)).toEqual(["An"]);
  });

  it("khong xoa duoc danh ba cua nguoi khac", async () => {
    const fake = createFakeRepo();
    await createContact(fake.repo, FAKE_OWNER, contactInput("Hồng"));

    await expect(
      deleteContact(fake.repo, "user_la", fake.state.contacts[0].id),
    ).rejects.toThrow(NotFoundError);
    expect(fake.state.contacts).toHaveLength(1);
  });
});
