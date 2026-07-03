import { json } from "../../_lib/http.js";

export async function onRequestGet(context) {
  const value = await context.env.SHARE_SNAPSHOTS.get(context.params.shareToken);
  if (!value) return json({ error: "Không tìm thấy link chia sẻ." }, { status: 404 });

  return json({ game: JSON.parse(value) });
}

