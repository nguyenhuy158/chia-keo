import { json, badRequest, readJson } from "../../_lib/http.js";
import { normalizeGame } from "../../_lib/validation.js";

const SHARE_TTL_SECONDS = 60 * 60 * 24 * 180;

function parseSnapshot(value) {
  const parsed = JSON.parse(value);

  if (parsed?.game) {
    return {
      game: parsed.game,
      permission: parsed.permission === "edit" ? "edit" : "view",
    };
  }

  return {
    game: parsed,
    permission: "view",
  };
}

export async function onRequestGet(context) {
  const value = await context.env.SHARE_SNAPSHOTS.get(context.params.shareToken);
  if (!value) return json({ error: "Không tìm thấy link chia sẻ." }, { status: 404 });

  return json(parseSnapshot(value));
}

export async function onRequestPut(context) {
  const value = await context.env.SHARE_SNAPSHOTS.get(context.params.shareToken);
  if (!value) return json({ error: "Không tìm thấy link chia sẻ." }, { status: 404 });

  const currentSnapshot = parseSnapshot(value);
  if (currentSnapshot.permission !== "edit") {
    return json({ error: "Link này chỉ có quyền xem." }, { status: 403 });
  }

  const body = await readJson(context.request);
  const game = normalizeGame(body?.game);
  if (!game || game.shareToken !== context.params.shareToken) {
    return badRequest("Dữ liệu chia sẻ không hợp lệ.");
  }

  await context.env.SHARE_SNAPSHOTS.put(
    context.params.shareToken,
    JSON.stringify({ game, permission: currentSnapshot.permission }),
    { expirationTtl: SHARE_TTL_SECONDS },
  );

  return json({ game, permission: currentSnapshot.permission });
}
