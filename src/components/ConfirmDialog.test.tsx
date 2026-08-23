import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ConfirmProvider, useConfirm } from "./ConfirmDialog";

function Harness({ destructive = false, description = "" }) {
  const confirm = useConfirm();
  const [result, setResult] = useState<string>("chưa hỏi");

  return (
    <button
      type="button"
      onClick={async () => {
        const ok = await confirm({
          title: "Xoá cuộc chia?",
          description: description || undefined,
          destructive,
        });
        setResult(ok ? "đồng ý" : "huỷ");
      }}
    >
      {result}
    </button>
  );
}

function renderHarness(props: Parameters<typeof Harness>[0] = {}) {
  render(
    <ConfirmProvider>
      <Harness {...props} />
    </ConfirmProvider>,
  );
  return { trigger: screen.getByRole("button", { name: "chưa hỏi" }) };
}

describe("useConfirm", () => {
  it("dung ngoai ConfirmProvider thi bao loi ro rang", () => {
    function Lonely() {
      useConfirm();
      return null;
    }

    expect(() => render(<Lonely />)).toThrow(/ConfirmProvider/);
  });
});

describe("ConfirmProvider", () => {
  it("chua hoi thi khong co hop thoai nao", () => {
    renderHarness();

    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("mo hop thoai kem tieu de va mo ta", async () => {
    const { trigger } = renderHarness({ description: "Không lấy lại được" });

    await userEvent.click(trigger);

    expect(screen.getByRole("alertdialog", { name: "Xoá cuộc chia?" })).toBeInTheDocument();
    expect(screen.getByText("Không lấy lại được")).toBeInTheDocument();
  });

  it("dong y thi Promise tra ve true", async () => {
    const { trigger } = renderHarness();

    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("button", { name: "Đồng ý" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "đồng ý" })).toBeInTheDocument());
  });

  it("huy thi Promise tra ve false", async () => {
    const { trigger } = renderHarness();

    await userEvent.click(trigger);
    const dialog = screen.getByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Hủy" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "huỷ" })).toBeInTheDocument());
  });

  it("Esc coi nhu huy", async () => {
    const { trigger } = renderHarness();

    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(screen.getByRole("button", { name: "huỷ" })).toBeInTheDocument());
  });

  it("nut xac nhan duoc nham san de Enter go ngay", async () => {
    const { trigger } = renderHarness();

    await userEvent.click(trigger);

    // Thay window.confirm() von nhan Enter la dong y.
    await waitFor(() => expect(screen.getByRole("button", { name: "Đồng ý" })).toHaveFocus());
  });

  it("khoa cuon trang khi hop thoai dang mo", async () => {
    const { trigger } = renderHarness();

    await userEvent.click(trigger);
    expect(document.body.style.overflow).toBe("hidden");

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(document.body.style.overflow).not.toBe("hidden"));
  });

  it("Tab khong roi ra khoi hop thoai", async () => {
    const { trigger } = renderHarness();
    await userEvent.click(trigger);

    await userEvent.tab();
    expect(screen.getByRole("alertdialog").contains(document.activeElement)).toBe(true);

    await userEvent.tab({ shift: true });
    expect(screen.getByRole("alertdialog").contains(document.activeElement)).toBe(true);
  });

  it("kieu 'khong hoan tac duoc' co them canh bao", async () => {
    const { trigger } = renderHarness({ destructive: true });

    await userEvent.click(trigger);

    expect(screen.getByRole("alertdialog").querySelector("svg")).not.toBeNull();
  });

  it("bam nen ngoai hop thoai coi nhu huy", async () => {
    const { trigger } = renderHarness();

    await userEvent.click(trigger);
    // Nen mo phia sau hop thoai cung co nhan "Huy" — day la cai nam ngoai dialog.
    const backdrop = screen
      .getAllByRole("button", { name: "Hủy" })
      .find((node) => !screen.getByRole("alertdialog").contains(node));
    await userEvent.click(backdrop as HTMLElement);

    await waitFor(() => expect(screen.getByRole("button", { name: "huỷ" })).toBeInTheDocument());
  });
});
