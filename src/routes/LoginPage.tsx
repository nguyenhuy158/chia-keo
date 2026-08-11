import { Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { ssoLoginUrl } from "../adapters/browser/sso";
import { useAppSession } from "../adapters/react-query/session-query";
import { ThemeToggle } from "../components/theme";
import { LoadingState } from "../components/ui";

/** Logo Google 4 mau; lucide khong co icon brand nen ve tay. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A8.99 8.99 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.94H.96a8.99 8.99 0 0 0 0 8.12l3.01-2.34Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A8.99 8.99 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export function LoginPage() {
  // Phai hoi /api/session: vao bang cookie SSO thi authClient khong thay gi.
  const { user, isPending } = useAppSession();
  const [googlePending, setGooglePending] = useState(false);

  if (isPending) {
    return (
      <section className="mx-auto flex min-h-screen w-full max-w-md items-center px-5">
        <div className="w-full">
          <LoadingState />
        </div>
      </section>
    );
  }

  if (user) {
    return <Navigate to="/" />;
  }

  /**
   * Dang nhap duy nhat qua SSO chung cua *.huyab.click: ca he sinh thai dung
   * MOT OAuth client, khong con form username/mat khau rieng cho app nay.
   */
  function handleGoogleSignIn() {
    setGooglePending(true);
    window.location.href = ssoLoginUrl();
  }

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-md items-center px-5">
      <div className="w-full rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-fuchsia-600 dark:text-fuchsia-400">
              Chia kèo
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-stone-950 dark:text-stone-50">
              Đăng nhập
            </h1>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
              Đăng nhập bằng tài khoản Google.
            </p>
          </div>
          <ThemeToggle />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googlePending}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
        >
          <GoogleMark />
          {googlePending ? "Đang chuyển..." : "Tiếp tục với Google"}
        </button>
      </div>
    </section>
  );
}
