import { createSession, createSessionCookie, createUser } from "../../_lib/auth.js";
import { badRequest, json, readJson } from "../../_lib/http.js";

const MIN_PASSWORD_LENGTH = 6;

export async function onRequestPost(context) {
  const body = await readJson(context.request);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) return badRequest("Nhập đầy đủ tên đăng nhập và mật khẩu.");
  if (password.length < MIN_PASSWORD_LENGTH) return badRequest("Mật khẩu phải có ít nhất 6 ký tự.");

  const user = await createUser(context.env.DB, username, password);
  if (user?.duplicate) return json({ error: "Tên đăng nhập đã tồn tại." }, { status: 409 });

  const token = await createSession(context.env.DB, user.id);

  return json(
    {
      session: {
        username: user.username,
        displayName: user.display_name || "",
      },
      games: [],
      expenseTemplates: [],
    },
    {
      status: 201,
      headers: {
        "Set-Cookie": createSessionCookie(token, context.request),
      },
    },
  );
}
