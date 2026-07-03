import { requireUser } from "../../_lib/auth.js";
import { readExpenseTemplates, readGames } from "../../_lib/db.js";
import { json } from "../../_lib/http.js";

export async function onRequestGet(context) {
  const auth = await requireUser(context);
  if (auth.response) return auth.response;

  const [games, expenseTemplates] = await Promise.all([
    readGames(context.env.DB, auth.user.id),
    readExpenseTemplates(context.env.DB, auth.user.id),
  ]);

  return json({
    session: {
      username: auth.user.username,
      displayName: auth.user.display_name || "",
    },
    games,
    expenseTemplates,
  });
}
