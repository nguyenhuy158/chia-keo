const categoryIds = new Set(["food", "transport", "lodging", "shopping", "entertainment", "other"]);
const participantNameLocale = "vi-VN";
const wordPattern = /[\p{L}\p{M}]+/gu;

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value) {
  return typeof value === "string" ? value : "";
}

function toParticipantTitleCase(value) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(wordPattern, (word) => {
      const characters = Array.from(word);
      const firstCharacter = characters[0] || "";
      const rest = characters.slice(1).join("");

      return `${firstCharacter.toLocaleUpperCase(participantNameLocale)}${rest.toLocaleLowerCase(
        participantNameLocale,
      )}`;
    });
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
        const participantName = toParticipantTitleCase(stringValue(participant.name));
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
  const receipts = Array.isArray(value.receipts)
    ? value.receipts.flatMap((receipt) => {
        if (!isRecord(receipt)) return [];
        const receiptId = stringValue(receipt.id).trim();
        const participantId = stringValue(receipt.participantId).trim();
        const amount = Number(receipt.amount);
        const receiptCreatedAt = stringValue(receipt.createdAt).trim();
        if (
          !receiptId ||
          !participantIds.has(participantId) ||
          !Number.isFinite(amount) ||
          amount <= 0 ||
          !receiptCreatedAt
        ) {
          return [];
        }

        return [
          {
            id: receiptId,
            participantId,
            amount: Math.round(amount),
            createdAt: receiptCreatedAt,
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
    receipts,
    shareToken,
    createdAt,
  };
}

export function normalizeExpenseTemplates(value) {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 12).flatMap((item) => {
    if (!isRecord(item)) return [];

    const id = stringValue(item.id).trim();
    const title = stringValue(item.title).trim();
    const amount = Number(item.amount);
    const createdAt = stringValue(item.createdAt).trim();
    if (!id || !title || !Number.isFinite(amount) || amount <= 0 || !createdAt) return [];

    return [
      {
        id,
        title,
        amount: Math.round(amount),
        categoryId: optionalCategory(item.categoryId),
        createdAt,
      },
    ];
  });
}
