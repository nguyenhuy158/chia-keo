import { requireUser } from "../../_lib/auth.js";
import { updateUserDisplayName } from "../../_lib/db.js";
import { badRequest, json, readJson } from "../../_lib/http.js";

export async function onRequestPut(context) {
  const auth = await requireUser(context);
  if (auth.response) return auth.response;

  const body = await readJson(context.request);
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";
  if (!displayName) return badRequest("Tên hiển thị không hợp lệ.");

  await updateUserDisplayName(context.env.DB, auth.user.id, displayName);

  return json({
    session: {
      username: auth.user.username,
      displayName,
    },
  });
}
