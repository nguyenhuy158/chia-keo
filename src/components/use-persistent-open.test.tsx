import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePersistentOpen } from "./use-persistent-open";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("usePersistentOpen", () => {
  it("lan dau dung mac dinh", () => {
    const hook = renderHook(() => usePersistentOpen("trash", true));

    expect(hook.result.current[0]).toBe(true);
  });

  it("nho lai lua chon qua cac lan tai trang", () => {
    const first = renderHook(() => usePersistentOpen("trash", true));
    act(() => first.result.current[1](false));

    const second = renderHook(() => usePersistentOpen("trash", true));
    expect(second.result.current[0]).toBe(false);
  });

  it("nhan ham cap nhat nhu useState", () => {
    const hook = renderHook(() => usePersistentOpen("history", false));

    act(() => hook.result.current[1]((current) => !current));

    expect(hook.result.current[0]).toBe(true);
  });

  it("moi key nho rieng", () => {
    const trash = renderHook(() => usePersistentOpen("trash", false));
    act(() => trash.result.current[1](true));

    expect(renderHook(() => usePersistentOpen("history", false)).result.current[0]).toBe(false);
  });

  it("localStorage bi chan luc doc thi ve mac dinh", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(renderHook(() => usePersistentOpen("trash", true)).result.current[0]).toBe(true);
  });

  it("localStorage bi chan luc ghi thi chi mat kha nang nho, khong vo app", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const hook = renderHook(() => usePersistentOpen("trash", false));

    act(() => hook.result.current[1](true));

    expect(hook.result.current[0]).toBe(true);
  });
});
