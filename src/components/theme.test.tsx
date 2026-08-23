import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider, ThemeToggle, useTheme } from "./theme";

let mediaListeners: (() => void)[] = [];

function stubMatchMedia(dark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: dark,
      addEventListener: (_event: string, handler: () => void) => mediaListeners.push(handler),
      removeEventListener: () => {},
    })),
  );
}

beforeEach(() => {
  mediaListeners = [];
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  stubMatchMedia(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function ThemeReadout() {
  const { mode, resolved } = useTheme();
  return <p>{`${mode}/${resolved}`}</p>;
}

describe("useTheme", () => {
  it("dung ngoai ThemeProvider thi bao loi ro rang", () => {
    expect(() => render(<ThemeReadout />)).toThrow(/ThemeProvider/);
  });
});

describe("ThemeProvider", () => {
  it("mac dinh theo he thong", () => {
    render(
      <ThemeProvider>
        <ThemeReadout />
      </ThemeProvider>,
    );

    expect(screen.getByText("system/light")).toBeInTheDocument();
  });

  it("he thong dang toi thi resolved la dark", () => {
    stubMatchMedia(true);

    render(
      <ThemeProvider>
        <ThemeReadout />
      </ThemeProvider>,
    );

    expect(screen.getByText("system/dark")).toBeInTheDocument();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("doc lai lua chon da luu tu lan truoc", () => {
    localStorage.setItem("chia-keo-theme", "dark");

    render(
      <ThemeProvider>
        <ThemeReadout />
      </ThemeProvider>,
    );

    expect(screen.getByText("dark/dark")).toBeInTheDocument();
  });

  it("dang o che do 'theo he thong' thi doi theo he thong ngay", () => {
    render(
      <ThemeProvider>
        <ThemeReadout />
      </ThemeProvider>,
    );

    stubMatchMedia(true);
    mediaListeners.forEach((handler) => handler());

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("da chon tay thi khong nghe he thong nua", () => {
    localStorage.setItem("chia-keo-theme", "light");

    render(
      <ThemeProvider>
        <ThemeReadout />
      </ThemeProvider>,
    );

    expect(mediaListeners).toHaveLength(0);
  });
});

describe("ThemeToggle", () => {
  function renderToggle() {
    render(
      <ThemeProvider>
        <ThemeToggle />
        <ThemeReadout />
      </ThemeProvider>,
    );
  }

  it("bam lan luot xoay system -> light -> dark -> system", async () => {
    renderToggle();
    const button = () => screen.getByRole("button");

    expect(button()).toHaveAccessibleName(/Theo hệ thống/);

    await userEvent.click(button());
    expect(screen.getByText("light/light")).toBeInTheDocument();

    await userEvent.click(button());
    expect(screen.getByText("dark/dark")).toBeInTheDocument();

    await userEvent.click(button());
    expect(screen.getByText("system/light")).toBeInTheDocument();
  });

  it("luu lua chon de lan sau vao van giu", async () => {
    renderToggle();

    await userEvent.click(screen.getByRole("button"));

    expect(localStorage.getItem("chia-keo-theme")).toBe("light");
  });
});
