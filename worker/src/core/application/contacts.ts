import {
  buildContacts,
  type Contact,
  mergeContacts,
  normalizeContactName,
} from "../../../../shared/contacts";
import type { ContactInput, ContactUpdateInput } from "../../../../shared/schemas";
import { createId, nowIso } from "../../lib/ids";
import type { GameRepository } from "../ports/game-repository";
import { NotFoundError } from "./errors";

/**
 * Danh ba: bang `contacts` do user tu nhap, gop voi nhung nguoi suy ra tu
 * participant cac cuoc chia da tao. Luat uu tien o `mergeContacts`.
 */
export async function listContacts(
  repo: GameRepository,
  userId: string,
): Promise<{ contacts: Contact[] }> {
  const [book, participantRows] = await Promise.all([
    repo.contacts.listByOwner(userId),
    repo.participants.listByOwner(userId),
  ]);

  return { contacts: mergeContacts(book, buildContacts(participantRows)) };
}

/**
 * Them vao danh ba. Ten da co thi cap nhat dong cu chu khong tao dong thu hai:
 * nguoi dung go lai mot cai ten la y muon sua nguoi do, va hai dong "Hồng"
 * trong danh ba thi khong ai biet chon dong nao.
 */
export async function createContact(
  repo: GameRepository,
  userId: string,
  input: ContactInput,
): Promise<{ contacts: Contact[] }> {
  const now = nowIso();

  await repo.contacts.upsert({
    id: createId("contact"),
    ownerUserId: userId,
    name: input.name,
    nameKey: normalizeContactName(input.name),
    bankId: input.bankId,
    accountNo: input.accountNo,
    accountName: input.accountName,
    createdAt: now,
    updatedAt: now,
  });

  return listContacts(repo, userId);
}

export async function updateContact(
  repo: GameRepository,
  userId: string,
  contactId: string,
  input: ContactUpdateInput,
): Promise<{ contacts: Contact[] }> {
  const existing = await repo.contacts.getOwned(contactId, userId);
  if (!existing) throw new NotFoundError();

  await repo.contacts.update(
    contactId,
    {
      ...(input.name === undefined ? {} : { name: input.name, nameKey: normalizeContactName(input.name) }),
      ...(input.bankId === undefined ? {} : { bankId: input.bankId }),
      ...(input.accountNo === undefined ? {} : { accountNo: input.accountNo }),
      ...(input.accountName === undefined ? {} : { accountName: input.accountName }),
    },
    nowIso(),
  );

  return listContacts(repo, userId);
}

/**
 * Xoa khoi danh ba. Cac cuoc chia da co nguoi nay khong bi anh huong — vi the
 * nguoi da tung di cung se hien lai o danh sach duoi dang suy ra tu lich su.
 */
export async function deleteContact(
  repo: GameRepository,
  userId: string,
  contactId: string,
): Promise<{ contacts: Contact[] }> {
  const existing = await repo.contacts.getOwned(contactId, userId);
  if (!existing) throw new NotFoundError();

  await repo.contacts.delete(contactId);
  return listContacts(repo, userId);
}
