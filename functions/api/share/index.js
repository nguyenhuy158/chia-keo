import { json, badRequest, readJson } from "../../_lib/http.js";
import { normalizeGame } from "../../_lib/validation.js";

const SHARE_TTL_SECONDS = 60 * 60 * 24 * 180;

export async function onRequestPost(context) {
  const body = await readJson(context.request);
  const game = normalizeGame(body?.game);
  const permission = body?.permission === "edit" ? "edit" : "view";
  if (!game) return badRequest("Dữ liệu chia sẻ không hợp lệ.");

  await context.env.SHARE_SNAPSHOTS.put(game.shareToken, JSON.stringify({ game, permission }), {
    expirationTtl: SHARE_TTL_SECONDS,
  });

  return json({
    shareToken: game.shareToken,
    url: `/share/${game.shareToken}`,
    permission,
  });
}
