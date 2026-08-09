// Danh tinh hien tai, nhin thay CA HAI duong dang nhap.
//
// `authClient.useSession()` chi thay session cua better-auth: nguoi vao bang
// cookie SSO se bi coi la chua dang nhap va bi da ve /login vo han. Hook nay
// hoi `/api/session` — noi backend da gop hai duong lai.

import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "../browser/http-game-api";

export type SessionUser = { id: string; name: string; image: string | null };

export const sessionKeys = { all: ["session"] as const };

export function useAppSession() {
  const query = useQuery({
    queryKey: sessionKeys.all,
    queryFn: async (): Promise<{ user: SessionUser | null }> => {
      const response = await fetch(`${API_BASE}/api/session`, { credentials: "include" });
      if (!response.ok) return { user: null };
      return response.json();
    },
    // Dang nhap/dang xuat deu doi ca trang nen khong can poll; giu cache ngan
    // de quay lai tab khong phai hoi lai lien tuc.
    staleTime: 30_000,
  });

  return { user: query.data?.user || null, isPending: query.isPending };
}
