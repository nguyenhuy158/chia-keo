import { readSharedGame, saveSharedGame } from "../../_lib/db.js";
import { json, badRequest, readJson } from "../../_lib/http.js";
import { normalizeGame } from "../../_lib/validation.js";

export async function onRequestGet(context) {
  const snapshot = await readSharedGame(context.env.DB, context.params.shareToken);
  if (!snapshot) return json({ error: "Không tìm thấy link chia sẻ." }, { status: 404 });

  return json(snapshot);
}

export async function onRequestPut(context) {
  const body = await readJson(context.request);
  const game = normalizeGame(body?.game);
  if (!game || game.shareToken !== context.params.shareToken) {
    return badRequest("Dữ liệu chia sẻ không hợp lệ.");
  }

  const saved = await saveSharedGame(context.env.DB, context.params.shareToken, game);
  if (!saved) return json({ error: "Không tìm thấy link chia sẻ." }, { status: 404 });
  if (saved.readonly) return json({ error: "Link này chỉ có quyền xem." }, { status: 403 });
  if (saved.invalid) return badRequest("Dữ liệu chia sẻ không hợp lệ.");

  return json(saved);
}
