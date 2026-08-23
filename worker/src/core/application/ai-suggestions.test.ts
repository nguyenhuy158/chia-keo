import { describe, expect, it, vi } from "vitest";
import type { AiContentPart, AiJsonResult, AiProvider } from "../ports/ai-provider";
import { suggestExpenseFromReceipt, suggestExpenseFromText } from "./ai-suggestions";
import { AiProviderError, NotFoundError } from "./errors";
import {
  createFakeRepo,
  FAKE_GAME_ID,
  FAKE_OWNER,
  participantRow,
} from "./fake-game-repository";

const AN = "participant_an";
const BINH = "participant_binh";

function twoPeople() {
  return createFakeRepo({
    participants: [
      participantRow(AN, "An"),
      participantRow(BINH, "Bình", { sequence: 1 }),
    ],
  });
}

/** AI gia: ghi lai parts nhan duoc de kiem tra prompt, tra ve ket qua dat truoc. */
function stubAi(result: AiJsonResult) {
  const generateJson = vi.fn<(parts: AiContentPart[]) => Promise<AiJsonResult>>(
    async () => result,
  );
  return { ai: { generateJson } satisfies AiProvider, generateJson };
}

describe("suggestExpenseFromText", () => {
  it("doi ten nguoi trong ket qua AI sang id participant", async () => {
    const fake = twoPeople();
    const stub = stubAi({
      ok: true,
      json: { title: "Nước", amount: 90000, payerName: "An", splitNames: ["An", "Bình"] },
    });

    const { suggestion } = await suggestExpenseFromText(
      { repo: fake.repo, ai: stub.ai },
      FAKE_OWNER,
      FAKE_GAME_ID,
      "an ứng 90k tiền nước",
    );

    expect(suggestion).toMatchObject({ title: "Nước", amount: 90_000, payerParticipantId: AN });
    expect(suggestion.splitParticipantIds).toEqual([AN, BINH]);
  });

  it("prompt kem ten nguoi tham gia va cau nhap", async () => {
    const fake = twoPeople();
    const stub = stubAi({ ok: true, json: {} });

    await suggestExpenseFromText(
      { repo: fake.repo, ai: stub.ai },
      FAKE_OWNER,
      FAKE_GAME_ID,
      "cà phê 50k",
    );

    const prompt = JSON.stringify(stub.generateJson.mock.calls[0][0]);
    expect(prompt).toContain("An");
    expect(prompt).toContain("cà phê 50k");
  });

  it("cuoc chua co ai thi prompt van goi duoc", async () => {
    const fake = createFakeRepo();
    const stub = stubAi({ ok: true, json: { title: "Nước", amount: 1000 } });

    await expect(
      suggestExpenseFromText(
        { repo: fake.repo, ai: stub.ai },
        FAKE_OWNER,
        FAKE_GAME_ID,
        "nước 1k",
      ),
    ).resolves.toBeTruthy();
  });

  it("AI loi thi nem AiProviderError kem ma loi", async () => {
    const fake = twoPeople();
    const stub = stubAi({ ok: false, error: "rate_limited" });

    await expect(
      suggestExpenseFromText({ repo: fake.repo, ai: stub.ai }, FAKE_OWNER, FAKE_GAME_ID, "x"),
    ).rejects.toThrow(new AiProviderError("rate_limited"));
  });

  it("nguoi la khong goi duoc", async () => {
    const fake = twoPeople();
    const stub = stubAi({ ok: true, json: {} });

    await expect(
      suggestExpenseFromText({ repo: fake.repo, ai: stub.ai }, "user_la", FAKE_GAME_ID, "x"),
    ).rejects.toThrow(NotFoundError);
    // Khong duoc goi AI khi chua qua duoc cua quyen.
    expect(stub.generateJson).not.toHaveBeenCalled();
  });
});

describe("suggestExpenseFromReceipt", () => {
  const image = { mimeType: "image/webp", data: "AAAA" };

  it("gui anh kem prompt OCR", async () => {
    const fake = twoPeople();
    const stub = stubAi({ ok: true, json: { title: "Hóa đơn ăn tối", amount: 250000 } });

    const { suggestion } = await suggestExpenseFromReceipt(
      { repo: fake.repo, ai: stub.ai },
      FAKE_OWNER,
      FAKE_GAME_ID,
      image,
    );

    expect(suggestion).toMatchObject({ title: "Hóa đơn ăn tối", amount: 250_000 });
    expect(stub.generateJson.mock.calls[0][0]).toContainEqual({ inlineData: image });
  });

  it("AI khong doc ra ten thi dat mac dinh 'Hoa don'", async () => {
    const fake = twoPeople();
    const stub = stubAi({ ok: true, json: { amount: 120000 } });

    const { suggestion } = await suggestExpenseFromReceipt(
      { repo: fake.repo, ai: stub.ai },
      FAKE_OWNER,
      FAKE_GAME_ID,
      image,
    );

    expect(suggestion.title).toBe("Hóa đơn");
  });

  it("AI loi thi nem AiProviderError", async () => {
    const fake = twoPeople();
    const stub = stubAi({ ok: false, error: "bad_image" });

    await expect(
      suggestExpenseFromReceipt({ repo: fake.repo, ai: stub.ai }, FAKE_OWNER, FAKE_GAME_ID, image),
    ).rejects.toThrow(new AiProviderError("bad_image"));
  });

  it("nguoi la khong goi duoc", async () => {
    const fake = twoPeople();
    const stub = stubAi({ ok: true, json: {} });

    await expect(
      suggestExpenseFromReceipt({ repo: fake.repo, ai: stub.ai }, "user_la", FAKE_GAME_ID, image),
    ).rejects.toThrow(NotFoundError);
  });
});
