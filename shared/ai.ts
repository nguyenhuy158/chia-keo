export type AiExpenseSuggestion = {
  title: string;
  amount: number;
  payerName: string;
  splitNames: string[];
  note: string;
  confidence: number;
};

export type ResolvedAiExpense = AiExpenseSuggestion & {
  payerParticipantId: string;
  splitParticipantIds: string[];
};

type NamedParticipant = {
  id: string;
  name: string;
};

/**
 * Chuan hoa JSON tho tu model AI ve dang goi y khoan chi; gia tri thieu hoac
 * sai kieu duoc dua ve mac dinh an toan.
 */
export function normalizeAiExpense(value: unknown): AiExpenseSuggestion {
  const raw = (value ?? {}) as Record<string, unknown>;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const amount = Number(raw.amount);
  const payerName = typeof raw.payerName === "string" ? raw.payerName.trim() : "";
  const splitNames = Array.isArray(raw.splitNames)
    ? raw.splitNames.flatMap((name) =>
        typeof name === "string" && name.trim() ? [name.trim()] : [],
      )
    : [];
  const confidence = Number(raw.confidence);

  return {
    title,
    amount: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0,
    payerName,
    splitNames,
    note: typeof raw.note === "string" ? raw.note.trim() : "",
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
  };
}

function normalizeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function findParticipantByName(participants: NamedParticipant[], name: string) {
  const target = normalizeName(name);
  if (!target) return undefined;

  return (
    participants.find((participant) => normalizeName(participant.name) === target) ||
    participants.find((participant) => normalizeName(participant.name).includes(target))
  );
}

/**
 * Doi ten nguoi tra / nguoi chia tu goi y AI sang participant id cua game
 * (so khop khong dau, khong phan biet hoa thuong). Khong khop duoc nguoi chia
 * nao thi fallback ve toan bo nguoi tham gia.
 */
export function resolveAiExpense(
  suggestion: AiExpenseSuggestion,
  participants: NamedParticipant[],
): ResolvedAiExpense {
  const payer = findParticipantByName(participants, suggestion.payerName);

  const splitIds = suggestion.splitNames.flatMap((name) => {
    const participant = findParticipantByName(participants, name);
    return participant ? [participant.id] : [];
  });
  const uniqueSplitIds = [...new Set(splitIds)];

  return {
    ...suggestion,
    payerParticipantId: payer?.id || "",
    splitParticipantIds:
      uniqueSplitIds.length > 0 ? uniqueSplitIds : participants.map((p) => p.id),
  };
}
