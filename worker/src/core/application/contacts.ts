import { buildContacts, type Contact } from "../../../../shared/contacts";
import type { GameRepository } from "../ports/game-repository";

/** Danh ba nguoi quen cua user, suy ra tu participant cac cuoc chia da tao. */
export async function listContacts(
  repo: GameRepository,
  userId: string,
): Promise<{ contacts: Contact[] }> {
  const rows = await repo.participants.listByOwner(userId);
  return { contacts: buildContacts(rows) };
}
