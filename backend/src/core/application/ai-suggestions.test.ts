import { describe, expect, it, vi } from "vitest";
import {
  suggestExpenseFromReceipt,
  suggestExpenseFromText,
} from "./ai-suggestions";
import { AiProviderError, NotFoundError } from "./errors";
import {
  createFakeRepo,
  FAKE_GAME_ID,
  FAKE_OWNER,
  participantRow,
} from "./fake-game-repository";

describe("AI expense suggestions", () => {
  it("chỉ đọc người tham gia của game có quyền truy cập", async () => {
    const fake = createFakeRepo();
    const ai = { generateJson: vi.fn() };
    await expect(
      suggestExpenseFromText(
        { repo: fake.repo, ai },
        "other",
        FAKE_GAME_ID,
        "Ăn tối",
      ),
    ).rejects.toThrow(NotFoundError);
    expect(ai.generateJson).not.toHaveBeenCalled();
  });

  it("gửi câu nhập cùng người tham gia và giải kết quả", async () => {
    const fake = createFakeRepo({ participants: [participantRow("an", "An")] });
    const ai = {
      generateJson: vi.fn().mockResolvedValue({
        ok: true,
        json: {
          title: "Ăn tối",
          amount: 100_000,
          payerName: "An",
          splitNames: ["An"],
        },
      }),
    };
    const result = await suggestExpenseFromText(
      { repo: fake.repo, ai },
      FAKE_OWNER,
      FAKE_GAME_ID,
      "An trả 100k",
    );
    expect(ai.generateJson.mock.calls[0]?.[0]?.[0]?.text).toContain(
      "Người tham gia: An",
    );
    expect(result.suggestion).toMatchObject({
      title: "Ăn tối",
      amount: 100_000,
      payerParticipantId: "an",
    });
  });

  it("báo lỗi provider và xử lý game chưa có người tham gia", async () => {
    const fake = createFakeRepo();
    const ai = {
      generateJson: vi
        .fn()
        .mockResolvedValue({ ok: false, error: "rate_limited" }),
    };
    await expect(
      suggestExpenseFromText(
        { repo: fake.repo, ai },
        FAKE_OWNER,
        FAKE_GAME_ID,
        "abc",
      ),
    ).rejects.toThrow(AiProviderError);
    expect(ai.generateJson.mock.calls[0]?.[0]?.[0]?.text).toContain("chưa có");
  });

  it("gửi ảnh hóa đơn và dùng tên mặc định khi AI bỏ trống", async () => {
    const fake = createFakeRepo();
    const ai = {
      generateJson: vi
        .fn()
        .mockResolvedValue({ ok: true, json: { amount: 25_000 } }),
    };
    const result = await suggestExpenseFromReceipt(
      { repo: fake.repo, ai },
      FAKE_OWNER,
      FAKE_GAME_ID,
      { mimeType: "image/png", data: "base64" },
    );
    expect(ai.generateJson.mock.calls[0]?.[0]?.[1]).toEqual({
      inlineData: { mimeType: "image/png", data: "base64" },
    });
    expect(result.suggestion.title).toBe("Hóa đơn");
  });

  it("giữ tên hóa đơn AI trả về và chuyển lỗi provider", async () => {
    const fake = createFakeRepo();
    const ai = {
      generateJson: vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: { title: "Cà phê" } })
        .mockResolvedValueOnce({ ok: false, error: "unavailable" }),
    };
    const deps = { repo: fake.repo, ai };
    const image = { mimeType: "image/png", data: "base64" };
    expect(
      (await suggestExpenseFromReceipt(deps, FAKE_OWNER, FAKE_GAME_ID, image))
        .suggestion.title,
    ).toBe("Cà phê");
    await expect(
      suggestExpenseFromReceipt(deps, FAKE_OWNER, FAKE_GAME_ID, image),
    ).rejects.toThrow(AiProviderError);
  });
});
