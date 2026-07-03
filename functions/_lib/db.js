export async function readGames(db, userId) {
  const [gameResult, participantResult, expenseResult, splitResult, receiptResult] = await Promise.all([
    db
      .prepare(
        `SELECT *
         FROM games
         WHERE owner_user_id = ?
         ORDER BY created_at DESC`,
      )
      .bind(userId)
      .all(),
    db
      .prepare(
        `SELECT participants.*
         FROM participants
         JOIN games ON games.id = participants.game_id
         WHERE games.owner_user_id = ?
         ORDER BY participants.sort_order ASC, participants.created_at ASC`,
      )
      .bind(userId)
      .all(),
    db
      .prepare(
        `SELECT expenses.*
         FROM expenses
         JOIN games ON games.id = expenses.game_id
         WHERE games.owner_user_id = ?
         ORDER BY expenses.created_at DESC`,
      )
      .bind(userId)
      .all(),
    db
      .prepare(
        `SELECT expense_splits.*
         FROM expense_splits
         JOIN expenses ON expenses.id = expense_splits.expense_id
         JOIN games ON games.id = expenses.game_id
         WHERE games.owner_user_id = ?
         ORDER BY expense_splits.sort_order ASC`,
      )
      .bind(userId)
      .all(),
    db
      .prepare(
        `SELECT receipts.*
         FROM receipts
         JOIN games ON games.id = receipts.game_id
         WHERE games.owner_user_id = ?
         ORDER BY receipts.created_at DESC`,
      )
      .bind(userId)
      .all(),
  ]);

  const games = (gameResult.results || []).map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    paymentProfile: {
      bankId: row.payment_bank_id || "",
      accountNo: row.payment_account_no || "",
      accountName: row.payment_account_name || "",
    },
    participants: [],
    expenses: [],
    receipts: [],
    shareToken: row.share_token,
    createdAt: row.created_at,
  }));
  const byGameId = new Map(games.map((game) => [game.id, game]));
  const expensesById = new Map();

  for (const row of participantResult.results || []) {
    byGameId.get(row.game_id)?.participants.push({
      id: row.id,
      name: row.name,
      avatarSeed: row.avatar_seed || undefined,
    });
  }

  for (const row of expenseResult.results || []) {
    const expense = {
      id: row.id,
      title: row.title,
      amount: row.amount,
      categoryId: row.category_id || "other",
      payerId: row.payer_id,
      splitParticipantIds: [],
      createdAt: row.created_at,
    };
    expensesById.set(expense.id, expense);
    byGameId.get(row.game_id)?.expenses.push(expense);
  }

  for (const row of splitResult.results || []) {
    expensesById.get(row.expense_id)?.splitParticipantIds.push(row.participant_id);
  }

  for (const row of receiptResult.results || []) {
    byGameId.get(row.game_id)?.receipts.push({
      id: row.id,
      participantId: row.participant_id,
      amount: row.amount,
      createdAt: row.created_at,
    });
  }

  return games;
}

export async function readGameById(db, gameId) {
  const game = await db.prepare("SELECT owner_user_id FROM games WHERE id = ?").bind(gameId).first();
  if (!game) return null;

  const games = await readGames(db, game.owner_user_id);

  return games.find((item) => item.id === gameId) || null;
}

export async function saveGame(db, userId, game) {
  const existingGame = await db.prepare("SELECT owner_user_id FROM games WHERE id = ?").bind(game.id).first();
  if (existingGame && existingGame.owner_user_id !== userId) {
    throw new Error("Game id belongs to another user.");
  }

  const now = new Date().toISOString();
  const statements = [
    db
      .prepare(
        `INSERT INTO games (
          id, owner_user_id, code, name, share_token, payment_bank_id,
          payment_account_no, payment_account_name, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          code = excluded.code,
          name = excluded.name,
          share_token = excluded.share_token,
          payment_bank_id = excluded.payment_bank_id,
          payment_account_no = excluded.payment_account_no,
          payment_account_name = excluded.payment_account_name,
          updated_at = excluded.updated_at`,
      )
      .bind(
        game.id,
        userId,
        game.code,
        game.name,
        game.shareToken,
        game.paymentProfile?.bankId || "",
        game.paymentProfile?.accountNo || "",
        game.paymentProfile?.accountName || "",
        game.createdAt,
        now,
      ),
    db.prepare("DELETE FROM expense_splits WHERE expense_id IN (SELECT id FROM expenses WHERE game_id = ?)").bind(game.id),
    db.prepare("DELETE FROM expenses WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM receipts WHERE game_id = ?").bind(game.id),
    db.prepare("DELETE FROM participants WHERE game_id = ?").bind(game.id),
  ];

  game.participants.forEach((participant, index) => {
    statements.push(
      db
        .prepare(
          `INSERT INTO participants (id, game_id, name, avatar_seed, sort_order, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(participant.id, game.id, participant.name, participant.avatarSeed || "", index, game.createdAt),
    );
  });

  game.expenses.forEach((expense) => {
    statements.push(
      db
        .prepare(
          `INSERT INTO expenses (id, game_id, title, amount, category_id, payer_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(expense.id, game.id, expense.title, expense.amount, expense.categoryId || "other", expense.payerId, expense.createdAt),
    );

    expense.splitParticipantIds.forEach((participantId, index) => {
      statements.push(
        db
          .prepare(
            `INSERT INTO expense_splits (expense_id, participant_id, sort_order)
             VALUES (?, ?, ?)`,
          )
          .bind(expense.id, participantId, index),
      );
    });
  });

  (game.receipts || []).forEach((receipt) => {
    statements.push(
      db
        .prepare(
          `INSERT INTO receipts (id, game_id, participant_id, amount, created_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .bind(receipt.id, game.id, receipt.participantId, receipt.amount, receipt.createdAt),
    );
  });

  await db.batch(statements);
}

export async function readOwnedGame(db, userId, gameId) {
  const games = await readGames(db, userId);

  return games.find((game) => game.id === gameId) || null;
}

export async function saveShareLink(db, gameId, shareToken, permission) {
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO share_links (share_token, game_id, permission, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(share_token) DO UPDATE SET
         game_id = excluded.game_id,
         permission = excluded.permission,
         updated_at = excluded.updated_at`,
    )
    .bind(shareToken, gameId, permission, now, now)
    .run();
}

export async function readSharedGame(db, shareToken) {
  const shareLink = await db.prepare("SELECT * FROM share_links WHERE share_token = ?").bind(shareToken).first();
  if (!shareLink) return null;

  const game = await readGameById(db, shareLink.game_id);
  if (!game) return null;

  return {
    game,
    permission: shareLink.permission === "edit" ? "edit" : "view",
  };
}

export async function saveSharedGame(db, shareToken, game) {
  const shareLink = await db.prepare("SELECT * FROM share_links WHERE share_token = ?").bind(shareToken).first();
  if (!shareLink) return null;
  if (shareLink.permission !== "edit") return { readonly: true };
  if (shareLink.game_id !== game.id || game.shareToken !== shareToken) return { invalid: true };

  const existingGame = await db.prepare("SELECT owner_user_id FROM games WHERE id = ?").bind(game.id).first();
  if (!existingGame) return null;

  await saveGame(db, existingGame.owner_user_id, game);
  await db.prepare("UPDATE share_links SET updated_at = ? WHERE share_token = ?").bind(new Date().toISOString(), shareToken).run();

  return {
    game,
    permission: "edit",
  };
}

export async function readExpenseTemplates(db, userId) {
  const result = await db
    .prepare(
      `SELECT *
       FROM expense_templates
       WHERE user_id = ?
       ORDER BY created_at DESC`,
    )
    .bind(userId)
    .all();

  return (result.results || []).map((row) => ({
    id: row.id,
    title: row.title,
    amount: row.amount,
    categoryId: row.category_id || "other",
    createdAt: row.created_at,
  }));
}

export async function replaceExpenseTemplates(db, userId, templates) {
  const statements = [db.prepare("DELETE FROM expense_templates WHERE user_id = ?").bind(userId)];

  templates.forEach((template) => {
    statements.push(
      db
        .prepare(
          `INSERT INTO expense_templates (id, user_id, title, amount, category_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .bind(template.id, userId, template.title, template.amount, template.categoryId || "other", template.createdAt),
    );
  });

  await db.batch(statements);
}

export async function updateUserDisplayName(db, userId, displayName) {
  await db.prepare("UPDATE users SET display_name = ? WHERE id = ?").bind(displayName, userId).run();
}
