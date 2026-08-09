import { Hono } from "hono";
import { userPreferencesPatchSchema } from "../../../shared/schemas";
import {
  getUserPreferences,
  updateUserPreferences,
} from "../core/application/user-preferences";
import { invalidInput, readJson, respond } from "../lib/http";
import { protectPaths, type AuthedEnv } from "../lib/require-user";

/** Tuy chon hien thi cua chinh minh; luon can dang nhap bang session. */
export const userPreferencesRouter = new Hono<AuthedEnv>();

protectPaths(userPreferencesRouter, "/preferences");

userPreferencesRouter.get("/preferences", (c) =>
  respond(c, () => getUserPreferences(c.get("repo"), c.get("userId"))),
);

userPreferencesRouter.patch("/preferences", async (c) => {
  const input = await readJson(c, userPreferencesPatchSchema);
  if (!input) return invalidInput(c);

  return respond(c, () => updateUserPreferences(c.get("repo"), c.get("userId"), input));
});
