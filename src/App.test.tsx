import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
  });

  afterEach(() => {
    cleanup();
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

  it("hiển thị trạng thái thiếu dữ liệu chia sẻ qua React Router", () => {
    renderApp("/share/missing-token");

    expect(screen.getByText("Không tìm thấy link chia sẻ")).toBeInTheDocument();
  });
});
