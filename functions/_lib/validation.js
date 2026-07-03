const categoryIds = new Set(["food", "transport", "lodging", "shopping", "entertainment", "other"]);

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value) {
  return typeof value === "string" ? value : "";
}

function optionalCategory(value) {
  return categoryIds.has(value) ? value : "other";
}

export function normalizeGame(value) {
  if (!isRecord(value)) return null;

  const id = stringValue(value.id).trim();
  const code = stringValue(value.code).trim();
  const name = stringValue(value.name).trim();
  const shareToken = stringValue(value.shareToken).trim();
  const createdAt = stringValue(value.createdAt).trim();
  if (!id || !code || !name || !shareToken || !createdAt) return null;

  const paymentProfile = isRecord(value.paymentProfile) ? value.paymentProfile : {};
  const participants = Array.isArray(value.participants)
    ? value.participants.flatMap((participant) => {
        if (!isRecord(participant)) return [];
        const participantId = stringValue(participant.id).trim();
        const participantName = stringValue(participant.name).trim();
        if (!participantId || !participantName) return [];

        return [
          {
            id: participantId,
            name: participantName,
            avatarSeed: stringValue(participant.avatarSeed).trim() || undefined,
          },
        ];
      })
    : [];

  const participantIds = new Set(participants.map((participant) => participant.id));
  const expenses = Array.isArray(value.expenses)
    ? value.expenses.flatMap((expense) => {
        if (!isRecord(expense)) return [];
        const expenseId = stringValue(expense.id).trim();
        const title = stringValue(expense.title).trim() || "Khoản chi";
        const amount = Number(expense.amount);
        const payerId = stringValue(expense.payerId).trim();
        const expenseCreatedAt = stringValue(expense.createdAt).trim();
        if (!expenseId || !Number.isFinite(amount) || amount < 0 || !participantIds.has(payerId) || !expenseCreatedAt) {
          return [];
        }

        const splitParticipantIds = Array.isArray(expense.splitParticipantIds)
          ? expense.splitParticipantIds.filter((id) => participantIds.has(id))
          : [];
        if (splitParticipantIds.length === 0) return [];

        return [
          {
            id: expenseId,
            title,
            amount: Math.round(amount),
            categoryId: optionalCategory(expense.categoryId),
            payerId,
            splitParticipantIds,
            createdAt: expenseCreatedAt,
          },
        ];
      })
    : [];

  return {
    id,
    code,
    name,
    paymentProfile: {
      bankId: stringValue(paymentProfile.bankId),
      accountNo: stringValue(paymentProfile.accountNo),
      accountName: stringValue(paymentProfile.accountName),
    },
    participants,
    expenses,
    shareToken,
    createdAt,
  };
}

