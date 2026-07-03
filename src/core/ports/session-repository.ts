export type LocalLoginResult =
  | {
      ok: true;
      username: string;
    }
  | {
      ok: false;
      error: string;
    };

export type SessionRepository = {
  loadSession: () => string;
  loadSessionToken: () => string;
  saveSession: (username: string, token?: string) => void;
  clearSession: () => void;
};
