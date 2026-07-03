import { requireUser } from "../../_lib/auth.js";
import { json } from "../../_lib/http.js";

export async function onRequestPost(context) {
  const auth = await requireUser(context);
  if (auth.response) return auth.response;

  await context.env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(auth.token).run();

  return json({ ok: true });
}

