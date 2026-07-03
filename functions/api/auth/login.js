import { createSession, loginOrCreateUser } from "../../_lib/auth.js";
import { badRequest, json, readJson } from "../../_lib/http.js";
import { readGames } from "../../_lib/db.js";

export async function onRequestPost(context) {
  const body = await readJson(context.request);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) return badRequest("Nhập đầy đủ tên đăng nhập và mật khẩu.");

  const user = await loginOrCreateUser(context.env.DB, username, password);
  if (!user) return json({ error: "Sai tên đăng nhập hoặc mật khẩu." }, { status: 401 });

  const token = await createSession(context.env.DB, user.id);
  const games = await readGames(context.env.DB, user.id);

  return json({
    session: {
      token,
      username: user.username,
    },
    games,
  });
}

