import posthog from "posthog-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { initAnalytics } from "./analytics";

vi.mock("posthog-js", () => ({ default: { init: vi.fn() } }));

beforeEach(() => {
  vi.mocked(posthog.init).mockReset();
});

describe("initAnalytics", () => {
  it("does nothing without a project key", () => {
    expect(initAnalytics({})).toBe(false);
    expect(initAnalytics({ key: "" })).toBe(false);
    expect(posthog.init).not.toHaveBeenCalled();
  });

  it("starts PostHog on the default host without recording sessions", async () => {
    expect(initAnalytics({ key: "phc_test" })).toBe(true);
    await vi.waitFor(() => expect(posthog.init).toHaveBeenCalled());
    expect(posthog.init).toHaveBeenCalledWith("phc_test", {
      api_host: "https://us.i.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: "history_change",
      disable_session_recording: true,
    });
  });

  it("uses the configured host", async () => {
    initAnalytics({ key: "phc_test", host: "https://eu.i.posthog.com" });
    await vi.waitFor(() => expect(posthog.init).toHaveBeenCalled());
    expect(posthog.init).toHaveBeenCalledWith(
      "phc_test",
      expect.objectContaining({ api_host: "https://eu.i.posthog.com" }),
    );
  });
});
