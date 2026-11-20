import { describe, expect, it } from "vitest";
import {
  listShareCandidates,
  unshareGame,
  unshareGameByEmail,
} from "./collaborators";
import { NotFoundError } from "./errors";
import { addExpense, recordTransfer, reorderExpenses } from "./expenses";
import { createFakeRepo } from "./fake-game-repository";
import { listGameEvents } from "./game-events";
import { addParticipants, reorderParticipants } from "./participants";
import { setShareLinkEnabled } from "./share-links";

describe("missing game access", () => {
  it("rejects owner, event, participant and share mutations for absent games", async () => {
    const { repo } = createFakeRepo({ games: [] });
    const calls = [
      listShareCandidates(repo, "owner", "missing"),
      unshareGame(repo, "owner", "missing", "guest"),
      unshareGameByEmail(repo, "owner", "missing", "guest@example.com"),
      listGameEvents(repo, "owner", "missing"),
      addParticipants(repo, "owner", "missing", { people: [] }),
      reorderParticipants(repo, "owner", "missing", []),
      setShareLinkEnabled(repo, "owner", "missing", true),
      addExpense(repo, "owner", "missing", {
        kind: "expense",
        category: "",
        amount: 100,
        title: "Sân",
        note: "",
        payerParticipantId: "p1",
        splitMode: "equal",
        splitParticipantIds: ["p1"],
        splits: [],
      }),
      recordTransfer(repo, "owner", "missing", {
        fromParticipantId: "p1",
        toParticipantId: "p2",
        amount: 100,
        note: "",
      }),
      reorderExpenses(repo, "owner", "missing", []),
    ];
    for (const call of calls)
      await expect(call).rejects.toBeInstanceOf(NotFoundError);
  });
});
