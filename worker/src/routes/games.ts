import { Hono } from "hono";
import {
  collaboratorInputSchema,
  contactInputSchema,
  contactUpdateSchema,
  expenseInputSchema,
  expenseReorderInputSchema,
  gameInputSchema,
  gameUpdateSchema,
  participantBatchInputSchema,
  participantInputSchema,
  shareLinkInputSchema,
  transferInputSchema,
} from "../../../shared/schemas";
import {
  listShareCandidates,
  shareGame,
  unshareGame,
  unshareGameByEmail,
} from "../core/application/collaborators";
import {
  addExpense,
  recordTransfer,
  removeExpense,
  reorderExpenses,
  updateExpense,
} from "../core/application/expenses";
import {
  createGame,
  deleteGame,
  duplicateGame,
  getGameDetailForOwner,
  listDeletedGames,
  listGames,
  purgeGame,
  restoreGame,
  updateGame,
} from "../core/application/games";
import {
  createContact,
  deleteContact,
  listContacts,
  updateContact,
} from "../core/application/contacts";
import { listGameEvents, undoGameEvent } from "../core/application/game-events";
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

protectPaths(
  gamesRouter,
  "/games",
  "/games/*",
  "/participants/*",
  "/expenses/*",
  "/events/*",
  "/contacts",
  "/contacts/*",
);

gamesRouter.get("/contacts", (c) => respond(c, () => listContacts(c.get("repo"), c.get("userId"))));

gamesRouter.post("/contacts", async (c) => {
  const input = await readJson(c, contactInputSchema);
  if (!input) return invalidInput(c);

  return respond(c, () => createContact(c.get("repo"), c.get("userId"), input), 201);
});

gamesRouter.patch("/contacts/:contactId", async (c) => {
  const input = await readJson(c, contactUpdateSchema);
  if (!input) return invalidInput(c);

  return respond(c, () =>
    updateContact(c.get("repo"), c.get("userId"), c.req.param("contactId"), input),
  );
});

gamesRouter.delete("/contacts/:contactId", (c) =>
  respond(c, () => deleteContact(c.get("repo"), c.get("userId"), c.req.param("contactId"))),
);

gamesRouter.get("/games", (c) => respond(c, () => listGames(c.get("repo"), c.get("userId"))));

gamesRouter.post("/games", async (c) => {
  const input = await readJson(c, gameInputSchema);
  if (!input) return invalidInput(c);

  return respond(c, () => createGame(c.get("repo"), c.get("userId"), input), 201);
});

gamesRouter.get("/games/trash", (c) =>
  respond(c, () => listDeletedGames(c.get("repo"), c.get("userId"))),
);

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

gamesRouter.post("/games/:gameId/restore", (c) =>
  respond(c, () => restoreGame(c.get("repo"), c.get("userId"), c.req.param("gameId"))),
);

gamesRouter.delete("/games/:gameId/purge", (c) =>
  respond(c, async () => {
    await purgeGame(c.get("repo"), c.get("userId"), c.req.param("gameId"));
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

gamesRouter.get("/games/:gameId/events", (c) =>
  respond(c, () => listGameEvents(c.get("repo"), c.get("userId"), c.req.param("gameId"))),
);

gamesRouter.post("/events/:eventId/undo", (c) =>
  respond(c, () => undoGameEvent(c.get("repo"), c.get("userId"), c.req.param("eventId"))),
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

gamesRouter.patch("/games/:gameId/expenses/reorder", async (c) => {
  const input = await readJson(c, expenseReorderInputSchema);
  if (!input) return invalidInput(c);

  return respond(c, () =>
    reorderExpenses(c.get("repo"), c.get("userId"), c.req.param("gameId"), input.expenseIds),
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

gamesRouter.get("/games/:gameId/collaborators/candidates", (c) =>
  respond(c, () =>
    listShareCandidates(c.get("repo"), c.get("userId"), c.req.param("gameId")),
  ),
);

gamesRouter.post("/games/:gameId/collaborators", async (c) => {
  const input = await readJson(c, collaboratorInputSchema);
  if (!input) return invalidInput(c);

  return respond(
    c,
    () => shareGame(c.get("repo"), c.get("userId"), c.req.param("gameId"), input.email),
    201,
  );
});

gamesRouter.delete("/games/:gameId/collaborators/pending/:email", (c) =>
  respond(c, () =>
    unshareGameByEmail(
      c.get("repo"),
      c.get("userId"),
      c.req.param("gameId"),
      decodeURIComponent(c.req.param("email")),
    ),
  ),
);

gamesRouter.delete("/games/:gameId/collaborators/:collaboratorUserId", (c) =>
  respond(c, () =>
    unshareGame(
      c.get("repo"),
      c.get("userId"),
      c.req.param("gameId"),
      c.req.param("collaboratorUserId"),
    ),
  ),
);

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
