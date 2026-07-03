import { requireUser } from "../../_lib/auth.js";
import { readOwnedGame, saveGame } from "../../_lib/db.js";
import { badRequest, json, readJson } from "../../_lib/http.js";
import { normalizeGame } from "../../_lib/validation.js";

export async function onRequestPut(context) {
  const auth = await requireUser(context);
  if (auth.response) return auth.response;

  const body = await readJson(context.request);
  const game = normalizeGame(body?.game);
  if (!game || game.id !== context.params.gameId) return badRequest("Dữ liệu cuộc chơi không hợp lệ.");

  const existingGame = await readOwnedGame(context.env.DB, auth.user.id, context.params.gameId);
  if (!existingGame) return json({ error: "Không tìm thấy cuộc chơi." }, { status: 404 });

  await saveGame(context.env.DB, auth.user.id, game);

  return json({ game });
}

