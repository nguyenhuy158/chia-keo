import { Hono } from "hono";
import { profileInputSchema } from "../../../shared/schemas";
import { updateProfileName } from "../core/application/profile";
import { invalidInput, readJson, respond } from "../lib/http";
import { protectPaths, type AuthedEnv } from "../lib/require-user";

/** Ho so cua chinh minh; hien chi cho doi ten hien thi. */
export const profileRouter = new Hono<AuthedEnv>();

protectPaths(profileRouter, "/profile");

profileRouter.patch("/profile", async (c) => {
  const input = await readJson(c, profileInputSchema);
  if (!input) return invalidInput(c);

  return respond(c, () => updateProfileName(c.get("repo"), c.get("userId"), input.name));
});
