import type { ApiAiSuggestionResponse } from "../../../../shared/api-types";
import { normalizeAiExpense, resolveAiExpense } from "../../../../shared/ai";
import type { AiContentPart, AiProvider } from "../ports/ai-provider";
import type { GameRepository } from "../ports/game-repository";
import { AiProviderError, NotFoundError } from "./errors";
import { getAccessibleGame } from "./game-detail";

type AiDeps = {
  repo: GameRepository;
  ai: AiProvider;
};

async function loadOwnedGameParticipants(deps: AiDeps, userId: string, gameId: string) {
  const game = await getAccessibleGame(deps.repo, gameId, userId);
  if (!game) throw new NotFoundError();

  const participants = await deps.repo.participants.listByGame(game.id);
  return participants.map((participant) => ({ id: participant.id, name: participant.name }));
}

export async function suggestExpenseFromText(
  deps: AiDeps,
  userId: string,
  gameId: string,
  text: string,
): Promise<ApiAiSuggestionResponse> {
  const participants = await loadOwnedGameParticipants(deps, userId, gameId);

  const prompt = [
    "Bạn là trợ lý nhập chi tiêu nhóm tiếng Việt.",
    "Hãy đọc câu nhập chi và trả JSON duy nhất theo schema:",
    '{"title":"string","amount":number,"payerName":"string","splitNames":["string"],"note":"string","confidence":number}',
    "Quy đổi k/nghìn thành 1000, tr/triệu thành 1000000.",
    "Nếu không rõ người chia thì dùng toàn bộ người tham gia.",
    `Người tham gia: ${participants.map((participant) => participant.name).join(", ") || "chưa có"}.`,
    `Cau nhap: ${text}`,
  ].join("\n");

  const result = await deps.ai.generateJson([{ text: prompt }]);
  if (!result.ok) throw new AiProviderError(result.error);

  const suggestion = resolveAiExpense(normalizeAiExpense(result.json), participants);
  return { suggestion };
}

export async function suggestExpenseFromReceipt(
  deps: AiDeps,
  userId: string,
  gameId: string,
  image: { mimeType: string; data: string },
): Promise<ApiAiSuggestionResponse> {
  const participants = await loadOwnedGameParticipants(deps, userId, gameId);

  const prompt = [
    "Bạn là trợ lý OCR hóa đơn tiếng Việt.",
    "Đọc ảnh hóa đơn và trả JSON duy nhất theo schema:",
    '{"title":"string","amount":number,"note":"string","confidence":number}',
    "amount là tổng tiền phải trả bằng VND, chỉ là số nguyên.",
    "title ngắn gọn, ví dụ: Hóa đơn ăn tối, Cà phê, Khách sạn.",
  ].join("\n");

  const parts: AiContentPart[] = [
    { text: prompt },
    { inlineData: { mimeType: image.mimeType, data: image.data } },
  ];

  const result = await deps.ai.generateJson(parts);
  if (!result.ok) throw new AiProviderError(result.error);

  const normalized = normalizeAiExpense(result.json);
  const suggestion = resolveAiExpense(
    { ...normalized, title: normalized.title || "Hóa đơn" },
    participants,
  );
  return { suggestion };
}
