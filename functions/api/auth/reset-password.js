import { hashPassword, requireUser } from "../../_lib/auth.js";
import { badRequest, json, readJson } from "../../_lib/http.js";

const MIN_PASSWORD_LENGTH = 6;

export async function onRequestPost(context) {
  const auth = await requireUser(context);
  if (auth.response) return auth.response;

  const body = await readJson(context.request);
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword || !newPassword) {
    return badRequest("Nhập đầy đủ mật khẩu hiện tại và mật khẩu mới.");
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) return badRequest("Mật khẩu mới phải có ít nhất 6 ký tự.");
  if (newPassword === currentPassword) return badRequest("Mật khẩu mới phải khác mật khẩu hiện tại.");

  const currentHash = await hashPassword(auth.user.username, currentPassword);
  if (auth.user.password_hash !== currentHash) {
    return json({ error: "Sai mật khẩu hiện tại." }, { status: 401 });
  }

  const newHash = await hashPassword(auth.user.username, newPassword);
  await context.env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(newHash, auth.user.id).run();
  await context.env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND token <> ?").bind(auth.user.id, auth.token).run();

  return json({ ok: true });
}
