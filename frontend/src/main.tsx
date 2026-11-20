import { registerSW } from "virtual:pwa-register";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { initAnalytics } from "./adapters/browser/analytics";
import { createHttpGameApi } from "./adapters/browser/http-game-api";
import { vietQrProvider } from "./adapters/browser/vietqr";
import { ConfirmProvider } from "./components/ConfirmDialog";
import { ThemeProvider } from "./components/theme";
import { provideGameApi, provideQrProvider } from "./core/container";
import { router } from "./router";
import "./styles.css";

// Composition root: cam adapter that vao cac port truoc khi render UI.
// Doi backend/QR provider (hoac mock de test) chi can doi 2 dong nay.
provideGameApi(createHttpGameApi());
provideQrProvider(vietQrProvider);
initAnalytics({
  key: import.meta.env.VITE_POSTHOG_KEY,
  host: import.meta.env.VITE_POSTHOG_HOST,
});

// Chi ton tai trong ban build (devOptions tat o vite.config.ts) — registerSW
// la no-op an toan luc dev vi module ao "virtual:pwa-register" tra ve ham
// rong khi khong co plugin PWA chay.
registerSW({ immediate: true });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/** Cao hon thanh dieu huong duoi cua trang cuoc choi tren dien thoai de toast khong che no. */
const MOBILE_TOAST_OFFSET = { bottom: "5rem" };

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ConfirmProvider>
          <RouterProvider router={router} />
        </ConfirmProvider>
        <Toaster
          position="bottom-center"
          mobileOffset={MOBILE_TOAST_OFFSET}
          theme="system"
          richColors
        />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
