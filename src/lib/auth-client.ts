import { usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { API_BASE } from "./api";

const FAKE_EMAIL_DOMAIN = "chia-keo.local";

export const authClient = createAuthClient({
  baseURL: `${API_BASE || window.location.origin}/api/auth`,
  plugins: [usernameClient()],
  fetchOptions: {
    credentials: "include",
  },
});

/**
 * Better Auth van yeu cau email khi dang ky; app chi dung username nen sinh
 * email noi bo tu username.
 */
export function usernameToEmail(username: string) {
  return `${username.toLowerCase()}@${FAKE_EMAIL_DOMAIN}`;
}
