import { zodResolver } from "@hookform/resolvers/zod";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { WalletCards } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { authClient, usernameToEmail } from "../lib/auth-client";
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

export function LoginPage() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [authError, setAuthError] = useState("");

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

  if (session?.user) {
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

    navigate({ to: "/" });
  });

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
