import { requireUser } from "../../_lib/auth.js";
import { readGames, saveGame } from "../../_lib/db.js";
import { badRequest, json, readJson } from "../../_lib/http.js";
import { normalizeGame } from "../../_lib/validation.js";

export async function onRequestGet(context) {
  const auth = await requireUser(context);
  if (auth.response) return auth.response;

  return json({ games: await readGames(context.env.DB, auth.user.id) });
}

export async function onRequestPost(context) {
  const auth = await requireUser(context);
  if (auth.response) return auth.response;

  const body = await readJson(context.request);
  const game = normalizeGame(body?.game);
  if (!game) return badRequest("Dữ liệu cuộc chơi không hợp lệ.");

  await saveGame(context.env.DB, auth.user.id, game);

  return json({ game }, { status: 201 });
}

