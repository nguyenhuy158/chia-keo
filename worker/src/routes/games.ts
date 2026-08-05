import { Hono } from "hono";
import {
  expenseInputSchema,
  gameInputSchema,
  gameUpdateSchema,
  participantBatchInputSchema,
  participantInputSchema,
  shareLinkInputSchema,
  transferInputSchema,
} from "../../../shared/schemas";
import {
  addExpense,
  recordTransfer,
  removeExpense,
  updateExpense,
} from "../core/application/expenses";
import {
  createGame,
  deleteGame,
  duplicateGame,
  getGameDetailForOwner,
  listGames,
  updateGame,
} from "../core/application/games";
import { listContacts } from "../core/application/contacts";
import {
  addParticipant,
  addParticipants,
  removeParticipant,
  updateParticipant,
} from "../core/application/participants";
import { rotateShareLink, setShareLinkEnabled } from "../core/application/share-links";
import { invalidInput, readJson, respond } from "../lib/http";
import { protectPaths, type AuthedEnv } from "../lib/require-user";

const participantUpdateSchema = participantInputSchema.partial();
const expenseUpdateSchema = expenseInputSchema.partial();

// Driving adapter: chi parse HTTP, goi use case va map ket qua/loi ve JSON.
export const gamesRouter = new Hono<AuthedEnv>();

protectPaths(gamesRouter, "/games", "/games/*", "/participants/*", "/expenses/*", "/contacts");

gamesRouter.get("/contacts", (c) => respond(c, () => listContacts(c.get("repo"), c.get("userId"))));

gamesRouter.get("/games", (c) => respond(c, () => listGames(c.get("repo"), c.get("userId"))));

gamesRouter.post("/games", async (c) => {
  const input = await readJson(c, gameInputSchema);
  if (!input) return invalidInput(c);

  return respond(c, () => createGame(c.get("repo"), c.get("userId"), input), 201);
});

gamesRouter.get("/games/:gameId", (c) =>
  respond(c, () => getGameDetailForOwner(c.get("repo"), c.get("userId"), c.req.param("gameId"))),
);

gamesRouter.patch("/games/:gameId", async (c) => {
  const input = await readJson(c, gameUpdateSchema);
  if (!input) return invalidInput(c);

  return respond(c, () => updateGame(c.get("repo"), c.get("userId"), c.req.param("gameId"), input));
});

gamesRouter.delete("/games/:gameId", (c) =>
  respond(c, async () => {
    await deleteGame(c.get("repo"), c.get("userId"), c.req.param("gameId"));
    return { ok: true };
  }),
);

gamesRouter.post("/games/:gameId/duplicate", (c) =>
  respond(c, () => duplicateGame(c.get("repo"), c.get("userId"), c.req.param("gameId")), 201),
);

gamesRouter.get("/games/:gameId/summary", (c) =>
  respond(c, async () => {
    const detail = await getGameDetailForOwner(
      c.get("repo"),
      c.get("userId"),
      c.req.param("gameId"),
    );
    return detail.summary;
  }),
);

gamesRouter.post("/games/:gameId/participants", async (c) => {
  const input = await readJson(c, participantInputSchema);
  if (!input) return invalidInput(c);

  return respond(
    c,
    () => addParticipant(c.get("repo"), c.get("userId"), c.req.param("gameId"), input),
    201,
  );
});

gamesRouter.post("/games/:gameId/participants/batch", async (c) => {
  const input = await readJson(c, participantBatchInputSchema);
  if (!input) return invalidInput(c);

  return respond(
    c,
    () => addParticipants(c.get("repo"), c.get("userId"), c.req.param("gameId"), input),
    201,
  );
});

gamesRouter.patch("/participants/:participantId", async (c) => {
  const input = await readJson(c, participantUpdateSchema);
  if (!input) return invalidInput(c);

  return respond(c, () =>
    updateParticipant(c.get("repo"), c.get("userId"), c.req.param("participantId"), input),
  );
});

gamesRouter.delete("/participants/:participantId", (c) =>
  respond(c, () =>
    removeParticipant(c.get("repo"), c.get("userId"), c.req.param("participantId")),
  ),
);

gamesRouter.post("/games/:gameId/expenses", async (c) => {
  const input = await readJson(c, expenseInputSchema);
  if (!input) return invalidInput(c);

  return respond(
    c,
    () => addExpense(c.get("repo"), c.get("userId"), c.req.param("gameId"), input),
    201,
  );
});

gamesRouter.patch("/expenses/:expenseId", async (c) => {
  const input = await readJson(c, expenseUpdateSchema);
  if (!input) return invalidInput(c);

  return respond(c, () =>
    updateExpense(c.get("repo"), c.get("userId"), c.req.param("expenseId"), input),
  );
});

gamesRouter.delete("/expenses/:expenseId", (c) =>
  respond(c, () => removeExpense(c.get("repo"), c.get("userId"), c.req.param("expenseId"))),
);

gamesRouter.post("/games/:gameId/transfers", async (c) => {
  const input = await readJson(c, transferInputSchema);
  if (!input) return invalidInput(c);

  return respond(
    c,
    () => recordTransfer(c.get("repo"), c.get("userId"), c.req.param("gameId"), input),
    201,
  );
});

gamesRouter.post("/games/:gameId/share-links", (c) =>
  respond(c, () => rotateShareLink(c.get("repo"), c.get("userId"), c.req.param("gameId")), 201),
);

gamesRouter.patch("/games/:gameId/share-link", async (c) => {
  const input = await readJson(c, shareLinkInputSchema);
  if (!input) return invalidInput(c);

  return respond(c, () =>
    setShareLinkEnabled(c.get("repo"), c.get("userId"), c.req.param("gameId"), input.enabled),
  );
});
