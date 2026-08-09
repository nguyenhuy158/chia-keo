import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { WalletCards } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { authClient, usernameToEmail } from "../adapters/browser/auth-client";
import { ssoLoginUrl } from "../adapters/browser/sso";
import { sessionKeys, useAppSession } from "../adapters/react-query/session-query";
import { ThemeToggle } from "../components/theme";
import { Field, LoadingState } from "../components/ui";

const credentialsSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username tối thiểu 3 ký tự")
    .max(30, "Username tối đa 30 ký tự")
    .regex(/^[a-zA-Z0-9_.]+$/, "Chỉ dùng chữ, số, dấu chấm và gạch dưới"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(128, "Mật khẩu quá dài"),
});

type CredentialsValues = z.infer<typeof credentialsSchema>;

type AuthMode = "sign-in" | "sign-up";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  INVALID_USERNAME_OR_PASSWORD: "Sai username hoặc mật khẩu.",
  USERNAME_IS_ALREADY_TAKEN: "Username đã có người dùng.",
  USER_ALREADY_EXISTS: "Tài khoản đã tồn tại.",
};

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
  const navigate = useNavigate();
  // Phai hoi /api/session: vao bang cookie SSO thi authClient khong thay gi.
  const { user, isPending } = useAppSession();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [authError, setAuthError] = useState("");
  const [googlePending, setGooglePending] = useState(false);

  const form = useForm<CredentialsValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: { username: "", password: "" },
  });

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

  const handleSubmit = form.handleSubmit(async (values) => {
    setAuthError("");

    const result =
      mode === "sign-in"
        ? await authClient.signIn.username({
            username: values.username,
            password: values.password,
          })
        : await authClient.signUp.email({
            email: usernameToEmail(values.username),
            name: values.username,
            username: values.username,
            password: values.password,
          });

    if (result.error) {
      const code = result.error.code || "";
      setAuthError(
        AUTH_ERROR_MESSAGES[code] || result.error.message || "Có lỗi xảy ra, thử lại sau.",
      );
      return;
    }

    // Cache /api/session dang giu user: null tu luc mo trang login; khong xoa
    // thi AppLayout doc lai cache cu va da nguoc ve day.
    await queryClient.invalidateQueries({ queryKey: sessionKeys.all });
    navigate({ to: "/" });
  });

  /**
   * Google di qua SSO chung cua *.huyab.click chu khong qua better-auth social:
   * ca he sinh thai dung MOT OAuth client, them app moi khong phai vao Google
   * console nua. Username/mat khau van la better-auth, khong doi gi.
   */
  function handleGoogleSignIn() {
    setAuthError("");
    setGooglePending(true);
    window.location.href = ssoLoginUrl();
  }

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-md items-center px-5">
      <form
        onSubmit={handleSubmit}
        className="w-full rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900"
      >
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-fuchsia-600 dark:text-fuchsia-400">
              Chia kèo
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-stone-950 dark:text-stone-50">
              {mode === "sign-in" ? "Đăng nhập" : "Đăng ký"}
            </h1>
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
              {mode === "sign-in"
                ? "Đăng nhập bằng username và mật khẩu."
                : "Tạo tài khoản mới để quản lý các cuộc chơi."}
            </p>
          </div>
          <ThemeToggle />
        </div>

        <div className="space-y-3">
          <Field label="Username" error={form.formState.errors.username?.message}>
            <input {...form.register("username")} className="field" placeholder="Tên đăng nhập" autoComplete="username" />
          </Field>
          <Field label="Mật khẩu" error={form.formState.errors.password?.message}>
            <input
              {...form.register("password")}
              type="password"
              className="field"
              placeholder="********"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            />
          </Field>
        </div>

        {authError && <p className="mt-3 text-sm text-rose-600 dark:text-rose-400">{authError}</p>}

        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 text-sm font-semibold text-white transition hover:from-violet-700 hover:to-fuchsia-700 disabled:cursor-not-allowed disabled:from-stone-400 disabled:to-stone-400"
        >
          <WalletCards size={18} />
          {mode === "sign-in" ? "Đăng nhập" : "Đăng ký"}
        </button>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
          <span className="text-xs font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
            hoặc
          </span>
          <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
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

        <button
          type="button"
          onClick={() => {
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            setAuthError("");
          }}
          className="mt-3 w-full text-center text-sm font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
        >
          {mode === "sign-in" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}
        </button>
      </form>
    </section>
  );
}
