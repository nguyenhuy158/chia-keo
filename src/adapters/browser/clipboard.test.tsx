import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copyImage, copyText, downloadBlob } from "./clipboard";

const originalClipboard = navigator.clipboard;

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, "clipboard", { value, configurable: true });
}

afterEach(() => {
  setClipboard(originalClipboard);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("copyText", () => {
  it("dung Clipboard API khi co", async () => {
    const writeText = vi.fn(async () => {});
    setClipboard({ writeText });

    expect(await copyText("xin chào")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("xin chào");
  });

  it("khong co Clipboard API thi fallback qua textarea", async () => {
    setClipboard(undefined);
    const execCommand = vi.fn(() => true);
    Object.defineProperty(document, "execCommand", { value: execCommand, configurable: true });

    expect(await copyText("xin chào")).toBe(true);
    expect(execCommand).toHaveBeenCalledWith("copy");
    // Textarea tam phai duoc don sach sau khi copy.
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("Clipboard API bi tu choi quyen thi van thu fallback", async () => {
    setClipboard({
      writeText: async () => {
        throw new Error("NotAllowedError");
      },
    });
    Object.defineProperty(document, "execCommand", {
      value: vi.fn(() => true),
      configurable: true,
    });

    expect(await copyText("x")).toBe(true);
  });

  it("fallback that bai thi tra ve false", async () => {
    setClipboard(undefined);
    Object.defineProperty(document, "execCommand", {
      value: () => {
        throw new Error("khong ho tro");
      },
      configurable: true,
    });

    expect(await copyText("x")).toBe(false);
    expect(document.querySelector("textarea")).toBeNull();
  });
});

describe("copyImage", () => {
  it("trinh duyet khong ho tro thi tra ve false de phia goi fallback", async () => {
    setClipboard(undefined);

    expect(await copyImage(Promise.resolve(new Blob()))).toBe(false);
  });

  it("copy duoc anh khi co ClipboardItem", async () => {
    const write = vi.fn(async () => {});
    setClipboard({ write });
    vi.stubGlobal(
      "ClipboardItem",
      class {
        constructor(public readonly items: Record<string, Promise<Blob>>) {}
      },
    );

    expect(await copyImage(Promise.resolve(new Blob()))).toBe(true);
    expect(write).toHaveBeenCalled();
  });

  it("clipboard nem loi thi tra ve false", async () => {
    setClipboard({
      write: async () => {
        throw new Error("NotAllowedError");
      },
    });
    vi.stubGlobal("ClipboardItem", class {});

    expect(await copyImage(Promise.resolve(new Blob()))).toBe(false);
  });
});

describe("downloadBlob", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:fake"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("tao link tai ve roi don sach", () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadBlob(new Blob(["x"]), "tom-tat.png");

    expect(click).toHaveBeenCalled();
    // Link tam khong duoc o lai trong DOM.
    expect(document.querySelector("a[download]")).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake");
  });
});
