import { requireUser } from "../../_lib/auth.js";
import { readExpenseTemplates, replaceExpenseTemplates } from "../../_lib/db.js";
import { json, readJson } from "../../_lib/http.js";
import { normalizeExpenseTemplates } from "../../_lib/validation.js";

export async function onRequestGet(context) {
  const auth = await requireUser(context);
  if (auth.response) return auth.response;

  return json({ expenseTemplates: await readExpenseTemplates(context.env.DB, auth.user.id) });
}

export async function onRequestPut(context) {
  const auth = await requireUser(context);
  if (auth.response) return auth.response;

  const body = await readJson(context.request);
  const expenseTemplates = normalizeExpenseTemplates(body?.expenseTemplates);
  await replaceExpenseTemplates(context.env.DB, auth.user.id, expenseTemplates);

  return json({ expenseTemplates });
}
