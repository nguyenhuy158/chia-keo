import { Hono } from "hono";
import { shuttleEntryInputSchema } from "../../../shared/schemas";
import {
  createShuttleEntry,
  deleteShuttleEntry,
  getShuttleStock,
} from "../core/application/shuttles";
import { invalidInput, readJson, respond } from "../lib/http";
import { protectPaths, type AuthedEnv } from "../lib/require-user";

/** Kho cau cua chinh minh; luon can dang nhap. */
export const shuttlesRouter = new Hono<AuthedEnv>();

protectPaths(shuttlesRouter, "/shuttles", "/shuttles/*");

shuttlesRouter.get("/shuttles", (c) =>
  respond(c, () => getShuttleStock(c.get("repo"), c.get("userId"))),
);

shuttlesRouter.post("/shuttles/entries", async (c) => {
  const input = await readJson(c, shuttleEntryInputSchema);
  if (!input) return invalidInput(c);

  return respond(c, () => createShuttleEntry(c.get("repo"), c.get("userId"), input));
});

shuttlesRouter.delete("/shuttles/entries/:entryId", (c) =>
  respond(c, () =>
    deleteShuttleEntry(c.get("repo"), c.get("userId"), c.req.param("entryId")),
  ),
);
