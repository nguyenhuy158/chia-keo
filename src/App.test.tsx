import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
    localStorage.clear();
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

  it("hiển thị màn hình đăng nhập cục bộ", () => {
    renderApp();

    expect(screen.getByRole("button", { name: /đăng nhập/i })).toBeInTheDocument();
  });

  it("báo rõ khi Google login chưa được cấu hình", () => {
    renderApp();

    fireEvent.click(screen.getByRole("button", { name: /tiếp tục với google/i }));

    expect(screen.getByText("Google login chưa được cấu hình.")).toBeInTheDocument();
  });

  it("hiển thị trạng thái thiếu dữ liệu chia sẻ qua React Router", async () => {
    renderApp("/share/missing-token");

    expect(await screen.findByText("Không tìm thấy link chia sẻ")).toBeInTheDocument();
  });
});
