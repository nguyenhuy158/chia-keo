import { requireUser } from "../../_lib/auth.js";
import { saveGame, saveShareLink } from "../../_lib/db.js";
import { json, badRequest, readJson } from "../../_lib/http.js";
import { normalizeGame } from "../../_lib/validation.js";

export async function onRequestPost(context) {
  const auth = await requireUser(context);
  if (auth.response) return auth.response;

  const body = await readJson(context.request);
  const game = normalizeGame(body?.game);
  const permission = body?.permission === "edit" ? "edit" : "view";
  if (!game) return badRequest("Dữ liệu chia sẻ không hợp lệ.");

  await saveGame(context.env.DB, auth.user.id, game);
  await saveShareLink(context.env.DB, game.id, game.shareToken, permission);

  return json({
    shareToken: game.shareToken,
    url: `/share/${game.shareToken}`,
    permission,
  });
}
