import { zodResolver } from "@hookform/resolvers/zod";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { WalletCards } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { authClient, usernameToEmail } from "../lib/auth-client";
import { Field, LoadingState } from "../components/ui";

const credentialsSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username toi thieu 3 ky tu")
    .max(30, "Username toi da 30 ky tu")
    .regex(/^[a-zA-Z0-9_.]+$/, "Chi dung chu, so, dau cham va gach duoi"),
  password: z.string().min(8, "Mat khau toi thieu 8 ky tu").max(128, "Mat khau qua dai"),
});

type CredentialsValues = z.infer<typeof credentialsSchema>;

type AuthMode = "sign-in" | "sign-up";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  INVALID_USERNAME_OR_PASSWORD: "Sai username hoac mat khau.",
  USERNAME_IS_ALREADY_TAKEN: "Username da co nguoi dung.",
  USER_ALREADY_EXISTS: "Tai khoan da ton tai.",
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

  if (session) {
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
        AUTH_ERROR_MESSAGES[code] || result.error.message || "Co loi xay ra, thu lai sau.",
      );
      return;
    }

    navigate({ to: "/" });
  });

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-md items-center px-5">
      <form
        onSubmit={handleSubmit}
        className="w-full rounded-lg border border-stone-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">Chia keo</p>
          <h1 className="mt-2 text-2xl font-semibold text-stone-950">
            {mode === "sign-in" ? "Dang nhap" : "Dang ky"}
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            {mode === "sign-in"
              ? "Dang nhap bang username va mat khau."
              : "Tao tai khoan moi de quan ly cac cuoc choi."}
          </p>
        </div>

        <div className="space-y-3">
          <Field label="Username" error={form.formState.errors.username?.message}>
            <input {...form.register("username")} className="field" placeholder="huy" autoComplete="username" />
          </Field>
          <Field label="Mat khau" error={form.formState.errors.password?.message}>
            <input
              {...form.register("password")}
              type="password"
              className="field"
              placeholder="********"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
            />
          </Field>
        </div>

        {authError && <p className="mt-3 text-sm text-red-600">{authError}</p>}

        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-stone-950 px-4 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          <WalletCards size={18} />
          {mode === "sign-in" ? "Dang nhap" : "Dang ky"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "sign-in" ? "sign-up" : "sign-in");
            setAuthError("");
          }}
          className="mt-3 w-full text-center text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          {mode === "sign-in" ? "Chua co tai khoan? Dang ky" : "Da co tai khoan? Dang nhap"}
        </button>
      </form>
    </section>
  );
}
