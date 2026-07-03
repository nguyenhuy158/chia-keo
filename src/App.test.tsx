import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

function renderApp(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/share/:shareToken" element={<App />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: "Không tìm thấy link chia sẻ." }),
        }),
      ),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("hiển thị màn hình đăng nhập", async () => {
    renderApp();

    expect(await screen.findByRole("heading", { name: "Đăng nhập" })).toBeInTheDocument();
  });

  it("báo rõ khi Google login chưa được cấu hình", async () => {
    renderApp();

    fireEvent.click(await screen.findByRole("button", { name: /tiếp tục với google/i }));

    expect(screen.getByText("Google login chưa được cấu hình.")).toBeInTheDocument();
  });

  it("màn hình chưa đăng nhập chỉ cho đăng nhập hoặc tạo mới", async () => {
    renderApp();

    fireEvent.click(await screen.findByRole("button", { name: "Tạo mới" }));
    expect(screen.getByRole("heading", { name: "Tạo tài khoản" })).toBeInTheDocument();
    expect(screen.getByLabelText("Xác nhận mật khẩu")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Đổi mật khẩu" })).not.toBeInTheDocument();
  });

  it("chỉ đổi mật khẩu trong cài đặt sau khi đăng nhập", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);

      if (path === "/api/auth/session") {
        return {
          ok: true,
          json: async () => ({
            session: { username: "huy", displayName: "Huy" },
            games: [],
            expenseTemplates: [],
          }),
        };
      }

      if (path === "/api/auth/reset-password" && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({ ok: true }),
        };
      }

      return {
        ok: false,
        json: async () => ({ error: "Không gọi được máy chủ." }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);
    renderApp();

    fireEvent.click(await screen.findByRole("button", { name: "Cài đặt tài khoản" }));
    fireEvent.change(screen.getByLabelText("Mật khẩu hiện tại"), { target: { value: "old-pass" } });
    fireEvent.change(screen.getByLabelText("Mật khẩu mới"), { target: { value: "new-pass" } });
    fireEvent.change(screen.getByLabelText("Xác nhận mật khẩu"), { target: { value: "new-pass" } });
    fireEvent.click(screen.getByRole("button", { name: "Đổi mật khẩu" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/auth/reset-password", expect.any(Object));
    });
    const resetCall = fetchMock.mock.calls.find(([path]) => String(path) === "/api/auth/reset-password");
    const resetInit = resetCall?.[1] as RequestInit;

    expect(JSON.parse(String(resetInit.body))).toEqual({
      currentPassword: "old-pass",
      newPassword: "new-pass",
    });
  });

  it("hiển thị trạng thái thiếu dữ liệu chia sẻ qua React Router", async () => {
    renderApp("/share/missing-token");

    expect(await screen.findByText("Không tìm thấy link chia sẻ")).toBeInTheDocument();
  });

  it("tạo được cuộc chơi đầu tiên từ màn hình rỗng", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const path = String(input);

        if (path === "/api/auth/session") {
          return {
            ok: true,
            json: async () => ({
              session: { username: "huy" },
              games: [],
              expenseTemplates: [],
            }),
          };
        }

        if (path === "/api/games" && init?.method === "POST") {
          return {
            ok: true,
            json: async () => ({ game: JSON.parse(String(init.body)).game }),
          };
        }

        return {
          ok: false,
          json: async () => ({ error: "Không gọi được máy chủ." }),
        };
      }),
    );
    renderApp();

    const nameInput = await screen.findByPlaceholderText("Cuộc chơi mới");
    fireEvent.change(nameInput, { target: { value: "Hội An" } });
    fireEvent.submit(nameInput.closest("form") as HTMLFormElement);

    expect(await screen.findAllByText("Hội An")).not.toHaveLength(0);
  });
});
