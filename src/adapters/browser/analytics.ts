const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";

type AnalyticsEnv = { key?: string; host?: string };

export function initAnalytics({ key, host }: AnalyticsEnv) {
  if (!key) return false;
  void import("posthog-js").then(({ default: posthog }) =>
    posthog.init(key, {
      api_host: host || DEFAULT_POSTHOG_HOST,
      person_profiles: "identified_only",
      capture_pageview: "history_change",
      disable_session_recording: true,
    }),
  );
  return true;
}
