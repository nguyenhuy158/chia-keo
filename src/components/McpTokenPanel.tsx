import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronDown, Copy, KeyRound, Plug, Trash2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { ApiMcpToken } from "../../shared/api-types";
import {
  MAX_MCP_TOKENS_PER_USER,
  MCP_SCOPES,
  MCP_TOKEN_NAME_MAX_LENGTH,
  type McpScope,
} from "../../shared/schemas";
import { copyText } from "../adapters/browser/clipboard";
import {
  useCreateMcpToken,
  useMcpTokens,
  useRevokeMcpToken,
} from "../adapters/react-query/queries";
import { useConfirm } from "./ConfirmDialog";
import { useToast } from "./Toast";

/** Nhan tieng Viet cho tung quyen, kem tool ma quyen do mo ra. */
const SCOPE_INFO: Record<McpScope, { label: string; hint: string }> = {
  "games:read": {
    label: "Đọc cuộc chia của tôi",
    hint: "Danh sách và chi tiết cuộc chia (list_games, get_game)",
  },
  "summary:read": {
    label: "Đọc bản tổng kết",
    hint: "Bản tổng kết dạng chữ, có tên người và số tiền (get_summary_text)",
  },
  "share:read": {
    label: "Đọc qua link share",
    hint: "Mở cuộc chia bất kỳ bằng token trong link share (get_shared_game)",
  },
};

/** Bang voi breakpoint `lg` cua Tailwind, noi bo cuc doi sang hai cot. */
const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

function isDesktop() {
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

const EXPIRY_OPTIONS: { label: string; value: number | null }[] = [
  { label: "Không hết hạn", value: null },
  { label: "30 ngày", value: 30 },
  { label: "90 ngày", value: 90 },
  { label: "1 năm", value: 365 },
];

const tokenFormSchema = z.object({
  name: z.string().trim().min(1, "Nhập tên token").max(MCP_TOKEN_NAME_MAX_LENGTH),
  scopes: z.array(z.enum(MCP_SCOPES)).min(1, "Chọn ít nhất một quyền"),
  expiresInDays: z.number().int().nullable(),
});

type TokenFormValues = z.infer<typeof tokenFormSchema>;

const DEFAULT_VALUES: TokenFormValues = {
  name: "",
  scopes: ["games:read", "summary:read"],
  expiresInDays: null,
};

/** Loi tu backend, doi sang cau nguoi dung hieu duoc. */
const ERROR_MESSAGE: Record<string, string> = {
  too_many_mcp_tokens: `Đã đủ ${MAX_MCP_TOKENS_PER_USER} token chưa thu hồi, thu hồi bớt rồi tạo lại.`,
  rate_limited: "Tạo quá nhanh, chờ một phút rồi thử lại.",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function tokenStatus(token: ApiMcpToken) {
  if (token.revokedAt) return { label: "Đã thu hồi", tone: "rose" as const };
  if (!token.active) return { label: "Hết hạn", tone: "stone" as const };
  return { label: "Đang dùng", tone: "emerald" as const };
}

const STATUS_CLASS = {
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  stone: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
};

function CopyButton({ value, label }: { value: string; label: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const ok = await copyText(value);
    if (!ok) {
      toast("Không copy được, hãy chọn tay", "error");
      return;
    }
    setCopied(true);
    toast(`Đã copy ${label}`);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy ${label}`}
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-stone-300 bg-white px-2.5 text-xs font-medium text-stone-700 transition hover:bg-stone-50 active:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
    >
      {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
      Copy
    </button>
  );
}

/**
 * Ban token goc chi ton tai trong phan hoi cua request tao, khong lay lai duoc.
 * Hien no trong mot khoi rieng kem san lenh `claude mcp add` da dien san.
 */
function SecretCard({ secret, onDismiss }: { secret: string; onDismiss: () => void }) {
  const command = `claude mcp add --transport http chia-keo ${window.location.origin}/api/mcp --header "Authorization: Bearer ${secret}"`;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
      <div className="flex items-start gap-2">
        <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Token chỉ hiện lần này
          </p>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-300/90">
            Copy ngay và lưu lại. Đóng khối này là không xem lại được, chỉ còn cách tạo token mới.
          </p>

          <div className="mt-3 flex items-center gap-2">
            {/* break-all: token la mot "tu" 67 ky tu, phai cho xuong dong. */}
            <code className="min-w-0 flex-1 break-all rounded-md border border-amber-300 bg-white px-2.5 py-2 text-xs text-stone-900 dark:border-amber-500/40 dark:bg-stone-900 dark:text-stone-100">
              {secret}
            </code>
            <CopyButton value={secret} label="token" />
          </div>

          <p className="mt-3 text-xs font-medium text-amber-900 dark:text-amber-200">
            Gắn vào Claude Code
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre rounded-md border border-amber-300 bg-white px-2.5 py-2 text-xs text-stone-900 dark:border-amber-500/40 dark:bg-stone-900 dark:text-stone-100">
              {command}
            </code>
            <CopyButton value={command} label="lệnh" />
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="mt-3 inline-flex h-9 items-center rounded-md border border-amber-400 bg-white px-3 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 dark:border-amber-500/40 dark:bg-stone-900 dark:text-amber-200 dark:hover:bg-stone-800"
          >
            Tôi đã lưu token
          </button>
        </div>
      </div>
    </div>
  );
}

function TokenRow({ token }: { token: ApiMcpToken }) {
  const revokeToken = useRevokeMcpToken();
  const toast = useToast();
  const confirm = useConfirm();
  const status = tokenStatus(token);

  async function handleRevoke() {
    const ok = await confirm({
      title: `Thu hồi token "${token.name}"?`,
      description: "Client đang dùng sẽ mất quyền ngay.",
      confirmLabel: "Thu hồi",
      destructive: true,
    });
    if (!ok) return;

    await revokeToken.mutateAsync(token.id);
    toast("Đã thu hồi token");
  }

  return (
    <li className="rounded-md border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-stone-950 dark:text-stone-50">
            {token.name}
          </p>
          <code className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">
            {token.tokenPrefix}…
          </code>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_CLASS[status.tone]}`}
          >
            {status.label}
          </span>
          {!token.revokedAt && (
            <button
              type="button"
              onClick={handleRevoke}
              disabled={revokeToken.isPending}
              aria-label="Thu hồi token"
              title="Thu hồi"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-stone-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40 dark:text-stone-500 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {token.scopes.map((scope) => (
          <span
            key={scope}
            title={SCOPE_INFO[scope].hint}
            className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
          >
            {scope}
          </span>
        ))}
      </div>

      <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
        Tạo {formatDateTime(token.createdAt)}
        {" · "}
        {token.lastUsedAt ? `dùng lần cuối ${formatDateTime(token.lastUsedAt)}` : "chưa dùng lần nào"}
        {token.expiresAt && ` · hết hạn ${formatDateTime(token.expiresAt)}`}
      </p>
    </li>
  );
}


/**
 * Form tao token. Tren man hinh hep form dong san de trang chi con danh sach,
 * man hinh rong thi mo luon vi da xep hai cot.
 */
function CreateTokenForm({ onCreated }: { onCreated: (secret: string) => void }) {
  const createToken = useCreateMcpToken();
  const [open, setOpen] = useState(isDesktop);

  const form = useForm<TokenFormValues>({
    resolver: zodResolver(tokenFormSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const scopes = form.watch("scopes");
  const expiresInDays = form.watch("expiresInDays");

  function toggleScope(scope: McpScope) {
    form.setValue(
      "scopes",
      scopes.includes(scope) ? scopes.filter((item) => item !== scope) : [...scopes, scope],
      { shouldValidate: form.formState.isSubmitted },
    );
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    const created = await createToken.mutateAsync(values);
    onCreated(created.secret);
    form.reset(DEFAULT_VALUES);
    // Tren mobile gap form lai de khoi token hien ngay tren cung man hinh.
    if (!isDesktop()) setOpen(false);
  });

  const error = createToken.error
    ? ERROR_MESSAGE[createToken.error.message] || "Không tạo được token, thử lại sau."
    : null;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-sm font-semibold text-stone-800 dark:text-stone-200"
      >
        <KeyRound size={17} />
        Tạo token mới
        <ChevronDown
          size={16}
          className={`ml-auto text-stone-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div className={open ? "mt-3" : "hidden"}>
        <label
          htmlFor="mcp-token-name"
          className="block text-xs font-medium text-stone-700 dark:text-stone-300"
        >
          Tên token
        </label>
        <input
          id="mcp-token-name"
          {...form.register("name")}
          maxLength={MCP_TOKEN_NAME_MAX_LENGTH}
          placeholder="Claude Code ở máy bàn"
          className="field mt-1.5 w-full"
        />
        {form.formState.errors.name && (
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
            {form.formState.errors.name.message}
          </p>
        )}

        <p className="mt-3 text-xs font-medium text-stone-700 dark:text-stone-300">Quyền</p>
        <div className="mt-1.5 space-y-1.5">
          {MCP_SCOPES.map((scope) => (
            <label
              key={scope}
              className="flex cursor-pointer items-start gap-2.5 rounded-md border border-stone-200 p-2 transition hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-800"
            >
              <input
                type="checkbox"
                checked={scopes.includes(scope)}
                onChange={() => toggleScope(scope)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-violet-600"
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-stone-900 dark:text-stone-100">
                  {SCOPE_INFO[scope].label}
                </span>
                <span className="mt-0.5 block text-xs text-stone-500 dark:text-stone-400">
                  {SCOPE_INFO[scope].hint}
                </span>
              </span>
            </label>
          ))}
        </div>
        {form.formState.errors.scopes && (
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
            {form.formState.errors.scopes.message}
          </p>
        )}

        <p className="mt-3 text-xs font-medium text-stone-700 dark:text-stone-300">Thời hạn</p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {EXPIRY_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => form.setValue("expiresInDays", option.value)}
              className={`inline-flex h-9 items-center rounded-full border px-3 text-xs font-medium transition ${
                expiresInDays === option.value
                  ? "border-violet-600 bg-violet-50 text-violet-700 dark:border-violet-500 dark:bg-violet-500/15 dark:text-violet-300"
                  : "border-stone-300 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {error && <p className="mt-3 text-xs text-rose-600 dark:text-rose-400">{error}</p>}

        <button
          type="submit"
          disabled={createToken.isPending}
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-700"
        >
          <KeyRound size={16} />
          {createToken.isPending ? "Đang tạo..." : "Tạo token"}
        </button>
      </div>
    </form>
  );
}

/**
 * Quan ly token MCP: tao, xem danh sach, thu hoi. Truoc day chi tao duoc bang
 * cach goi API trong devtools console.
 */
export function McpTokenPanel() {
  const tokensQuery = useMcpTokens();
  const [secret, setSecret] = useState<string | null>(null);

  const tokens = tokensQuery.data || [];
  // Tran cua backend tinh theo token chua thu hoi (ke ca da het han), nen dem
  // dung nhu vay de con so tren UI khop voi luc bi tu choi tao them.
  const usedSlots = tokens.filter((token) => !token.revokedAt).length;

  return (
    <div className="space-y-3">
      <section className="rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center gap-2">
          <Plug size={17} className="shrink-0 text-violet-600 dark:text-violet-400" />
          <h2 className="text-sm font-semibold text-stone-950 dark:text-stone-50">
            Kết nối Claude (MCP)
          </h2>
        </div>
        <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
          Token cho Claude Code / Claude Desktop đọc dữ liệu chia tiền của bạn. Mọi tool đều chỉ
          đọc, và chỉ trong đúng các quyền bạn chọn lúc tạo.
        </p>
      </section>

      {secret && <SecretCard secret={secret} onDismiss={() => setSecret(null)} />}

      <div className="grid gap-3 lg:grid-cols-2">
        <CreateTokenForm onCreated={setSecret} />

        <section className="flex min-h-0 flex-col rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
              Token của tôi
            </h3>
            <span className="tabular text-xs text-stone-500 dark:text-stone-400">
              {usedSlots}/{MAX_MCP_TOKENS_PER_USER} chưa thu hồi
            </span>
          </div>

          {tokensQuery.isPending ? (
            <p className="py-4 text-sm text-stone-500 dark:text-stone-400">Đang tải...</p>
          ) : tokensQuery.isError ? (
            <p className="py-4 text-sm text-rose-600 dark:text-rose-400">
              Không tải được danh sách token.
            </p>
          ) : tokens.length === 0 ? (
            <p className="py-4 text-sm text-stone-500 dark:text-stone-400">
              Chưa có token nào. Tạo một token rồi dán lệnh vào Claude Code.
            </p>
          ) : (
            // Danh sach cuon trong khung de trang khong dai ra theo so token.
            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto lg:max-h-[60vh]">
              {tokens.map((token) => (
                <TokenRow key={token.id} token={token} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
