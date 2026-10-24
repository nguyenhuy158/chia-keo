import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SUMMARY_IMAGE_BACKGROUND_ID,
  getStoredSummaryImageBackgroundId,
  storeSummaryImageBackgroundId,
  SUMMARY_IMAGE_BACKGROUNDS,
} from "./summary-image-backgrounds";

afterEach(() => vi.unstubAllGlobals());

describe("summary image background storage", () => {
  it("loads a saved choice and falls back for unknown values", () => {
    const getItem = vi.fn().mockReturnValue(SUMMARY_IMAGE_BACKGROUNDS[1].id);
    vi.stubGlobal("localStorage", { getItem });
    expect(getStoredSummaryImageBackgroundId()).toBe(
      SUMMARY_IMAGE_BACKGROUNDS[1].id,
    );
    getItem.mockReturnValue("missing");
    expect(getStoredSummaryImageBackgroundId()).toBe(
      DEFAULT_SUMMARY_IMAGE_BACKGROUND_ID,
    );
    getItem.mockReturnValue(null);
    expect(getStoredSummaryImageBackgroundId()).toBe(
      DEFAULT_SUMMARY_IMAGE_BACKGROUND_ID,
    );
  });

  it("stores the choice and tolerates blocked storage", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", {
      setItem,
      getItem: () => {
        throw new Error("blocked");
      },
    });
    expect(getStoredSummaryImageBackgroundId()).toBe(
      DEFAULT_SUMMARY_IMAGE_BACKGROUND_ID,
    );
    storeSummaryImageBackgroundId("dem");
    expect(setItem).toHaveBeenCalledWith("chia-keo-summary-image-bg", "dem");
    setItem.mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => storeSummaryImageBackgroundId("dem")).not.toThrow();
  });
});
