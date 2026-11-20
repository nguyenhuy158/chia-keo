import type { GameRepository } from "../ports/game-repository";

/** Chi doi ten hien thi cua chinh minh; email/dang nhap khong doi. */
export async function updateProfileName(
  repo: GameRepository,
  userId: string,
  name: string,
): Promise<{ name: string }> {
  await repo.users.updateName(userId, name, new Date());
  return { name };
}
