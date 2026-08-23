// Cac panel phu: danh ba, chon nguoi tu danh ba, thung rac, lich su, chia se,
// nguoi tham gia, xem anh.

import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AN, BINH, createFakeGameApi, createTestQueryClient, GAME_ID, makeDetail, makePhoto } from "../test/fake-game-api";
import { CollaboratorsPanel } from "./CollaboratorsPanel";
import { ConfirmProvider } from "./ConfirmDialog";
import { ContactBookCard } from "./ContactBookCard";
import { ContactPicker } from "./ContactPicker";
import { HistoryPanel } from "./HistoryPanel";
import { ParticipantPanel } from "./ParticipantPanel";
import { PhotoViewer } from "./PhotoViewer";
import { TrashCard } from "./TrashCard";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ gameId: GAME_ID }),
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));

let api: ReturnType<typeof createFakeGameApi>;

function renderPanel(node: ReactNode) {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ConfirmProvider>{node}</ConfirmProvider>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

async function confirmDialog(user: ReturnType<typeof userEvent.setup>) {
  const dialog = await screen.findByRole("alertdialog");
  const buttons = within(dialog).getAllByRole("button");
  await user.click(buttons[buttons.length - 1]);
}

beforeEach(() => {
  api = createFakeGameApi();
  localStorage.clear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} })),
  );
});

describe("ContactBookCard", () => {
  it("danh ba rong thi khong hien dong nao", async () => {
    renderPanel(<ContactBookCard />);

    await waitFor(() => expect(api.contacts.list).toHaveBeenCalled());
    expect(screen.queryByText("Hồng")).toBeNull();
  });

  it("hien danh sach nguoi quen", async () => {
    api.contacts.list.mockResolvedValue({
      contacts: [{ name: "Hồng", bankId: "970436", accountNo: "0123", accountName: "HONG" }],
    } as never);
    renderPanel(<ContactBookCard />);

    expect(await screen.findByText("Hồng")).toBeInTheDocument();
  });

  it("them nguoi moi vao danh ba", async () => {
    const user = renderPanel(<ContactBookCard />);
    await waitFor(() => expect(api.contacts.list).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: "Thêm vào danh bạ" }));
    await user.type(screen.getByLabelText("Tên"), "Hồng");
    await user.click(screen.getByRole("button", { name: "Thêm" }));

    await waitFor(() => expect(api.contacts.create).toHaveBeenCalled());
  });
});

describe("ContactBookCard — sua va phan trang", () => {
  /** Mot dong danh ba nhu `mergeContacts` tra ve. */
  function contactRow(name: string, overrides: Record<string, unknown> = {}) {
    return {
      key: name.toLowerCase(),
      name,
      bankId: "",
      accountNo: "",
      accountName: "",
      gameCount: 0,
      lastUsedAt: "2026-08-01T00:00:00.000Z",
      source: "book",
      id: `contact_${name.toLowerCase()}`,
      ...overrides,
    };
  }

  function manyContacts(count: number) {
    return Array.from({ length: count }, (_unused, index) => contactRow(`Người ${index + 1}`));
  }

  it("chi hien 8 dong dau, bam Xem them moi lo tiep", async () => {
    api.contacts.list.mockResolvedValue({ contacts: manyContacts(12) } as never);
    const user = renderPanel(<ContactBookCard />);

    expect(await screen.findByText("Người 1")).toBeInTheDocument();
    expect(screen.queryByText("Người 9")).toBeNull();

    await user.click(screen.getByRole("button", { name: /Xem thêm/ }));

    expect(screen.getByText("Người 9")).toBeInTheDocument();
  });

  it("sua mot dong trong danh ba", async () => {
    api.contacts.list.mockResolvedValue({
      contacts: [contactRow("Hồng", { bankId: "970436", accountNo: "0123", accountName: "HONG" })],
    } as never);
    const user = renderPanel(<ContactBookCard />);
    await screen.findByText("Hồng");

    await user.click(screen.getByRole("button", { name: "Sửa Hồng" }));
    const accountNo = screen.getByDisplayValue("0123");
    await user.clear(accountNo);
    await user.type(accountNo, "999");
    await user.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() => expect(api.contacts.update).toHaveBeenCalled());
  });

  it("xoa mot dong sau khi xac nhan", async () => {
    api.contacts.list.mockResolvedValue({ contacts: [contactRow("Hồng")] } as never);
    const user = renderPanel(<ContactBookCard />);
    await screen.findByText("Hồng");

    await user.click(screen.getByRole("button", { name: "Xóa Hồng khỏi danh bạ" }));
    await confirmDialog(user);

    await waitFor(() => expect(api.contacts.remove).toHaveBeenCalled());
  });
});

describe("ContactPicker", () => {
  it("danh dau nguoi da co trong cuoc chia", async () => {
    api.contacts.list.mockResolvedValue({
      contacts: [
        { name: "An", bankId: "", accountNo: "", accountName: "" },
        { name: "Hồng", bankId: "", accountNo: "", accountName: "" },
      ],
    } as never);
    renderPanel(
      <ContactPicker
        participants={makeDetail().participants}
        pending={false}
        onAddMany={vi.fn()}
      />,
    );

    expect(await screen.findByText("Hồng")).toBeInTheDocument();
  });

  it("chon roi them mot luot", async () => {
    api.contacts.list.mockResolvedValue({
      contacts: [{ name: "Hồng", bankId: "", accountNo: "", accountName: "" }],
    } as never);
    const onAddMany = vi.fn(async () => {});
    const user = renderPanel(
      <ContactPicker participants={[]} pending={false} onAddMany={onAddMany} />,
    );

    await user.click(await screen.findByText("Hồng"));
    await user.click(screen.getByRole("button", { name: /Thêm/ }));

    await waitFor(() => expect(onAddMany).toHaveBeenCalledWith([expect.objectContaining({ name: "Hồng" })]));
  });
});

describe("TrashCard", () => {
  it("gap lai thi khong goi API", async () => {
    renderPanel(<TrashCard />);

    expect(api.games.trash).not.toHaveBeenCalled();
  });

  it("mo ra moi tai danh sach", async () => {
    const user = renderPanel(<TrashCard />);

    await user.click(screen.getByRole("button", { name: "Xem" }));

    await waitFor(() => expect(api.games.trash).toHaveBeenCalled());
  });

  it("phuc hoi mot cuoc chia", async () => {
    api.games.trash.mockResolvedValue([
      {
        id: GAME_ID,
        code: "DSKVUF",
        name: "Cầu lông",
        createdAt: "2026-08-01T00:00:00.000Z",
        deletedAt: "2026-08-02T00:00:00.000Z",
        participantCount: 2,
        expenseCount: 1,
        isOwner: true,
      },
    ] as never);
    const user = renderPanel(<TrashCard />);

    await user.click(screen.getByRole("button", { name: "Xem" }));
    await user.click(await screen.findByRole("button", { name: /Phục hồi/ }));

    await waitFor(() => expect(api.games.restore).toHaveBeenCalledWith(GAME_ID));
  });
});

describe("HistoryPanel", () => {
  it("dang gap thi khong goi API", () => {
    renderPanel(<HistoryPanel gameId={GAME_ID} collapsible />);

    expect(api.gameEvents.list).not.toHaveBeenCalled();
  });

  it("mobile luon mo nen tai ngay", async () => {
    renderPanel(<HistoryPanel gameId={GAME_ID} />);

    await waitFor(() => expect(api.gameEvents.list).toHaveBeenCalledWith(GAME_ID));
  });

  it("hien cac dong lich su", async () => {
    api.gameEvents.list.mockResolvedValue({
      events: [
        {
          id: "event_1",
          createdAt: "2026-08-01T00:00:00.000Z",
          undoneAt: null,
          payload: { kind: "game_created", name: "Cầu lông" },
        },
      ],
    } as never);
    renderPanel(<HistoryPanel gameId={GAME_ID} />);

    expect(await screen.findByText(/Cầu lông/)).toBeInTheDocument();
  });
});

describe("CollaboratorsPanel", () => {
  it("chu cuoc them duoc nguoi qua email", async () => {
    const user = renderPanel(
      <CollaboratorsPanel gameId={GAME_ID} isOwner collaborators={[]} />,
    );

    await user.type(screen.getByPlaceholderText(/email/i), "ban@example.com");
    await user.click(screen.getByRole("button", { name: /Chia sẻ|Thêm/ }));

    await waitFor(() =>
      expect(api.collaborators.add).toHaveBeenCalledWith(GAME_ID, "ban@example.com"),
    );
  });

  it("hien danh sach nguoi da duoc chia se", () => {
    renderPanel(
      <CollaboratorsPanel
        gameId={GAME_ID}
        isOwner
        collaborators={[{ userId: "user_ban", name: "Bạn", email: "ban@example.com" }]}
      />,
    );

    expect(screen.getByText(/ban@example.com/)).toBeInTheDocument();
  });

  it("server tu choi thi hien thong bao, khong im lang", async () => {
    // Panel khong tu doan email hop le hay chua — server la noi quyet dinh.
    api.collaborators.add.mockRejectedValue(new Error("already_shared"));
    const user = renderPanel(
      <CollaboratorsPanel gameId={GAME_ID} isOwner collaborators={[]} />,
    );

    await user.type(screen.getByPlaceholderText(/Email/), "ban@example.com");
    await user.click(screen.getByRole("button", { name: /Chia sẻ|Thêm/ }));

    expect(await screen.findByText("Người này đã được chia sẻ rồi.")).toBeInTheDocument();
  });

  it("go quyen cua mot nguoi sau khi xac nhan", async () => {
    const user = renderPanel(
      <CollaboratorsPanel
        gameId={GAME_ID}
        isOwner
        collaborators={[{ userId: "user_ban", name: "Bạn", email: "ban@example.com" }]}
      />,
    );

    await user.click(screen.getAllByRole("button").at(-1) as HTMLElement);
    await confirmDialog(user);

    await waitFor(() => expect(api.collaborators.remove).toHaveBeenCalledWith(GAME_ID, "user_ban"));
  });

  it("nguoi duoc chia se chi xem, khong them duoc", () => {
    renderPanel(
      <CollaboratorsPanel
        gameId={GAME_ID}
        isOwner={false}
        collaborators={[{ userId: "user_ban", name: "Bạn", email: "ban@example.com" }]}
      />,
    );

    expect(screen.queryByPlaceholderText(/email/i)).toBeNull();
  });
});

describe("ParticipantPanel", () => {
  const handlers = () => ({
    onAdd: vi.fn(async () => {}),
    onAddMany: vi.fn(async () => {}),
    onUpdate: vi.fn(async () => {}),
    onRemove: vi.fn(),
    onReorder: vi.fn(),
  });

  it("hien danh sach nguoi", () => {
    renderPanel(
      <ParticipantPanel participants={makeDetail().participants} pending={false} {...handlers()} />,
    );

    expect(screen.getByText("An")).toBeInTheDocument();
    expect(screen.getByText("Bình")).toBeInTheDocument();
  });

  it("them mot nguoi moi", async () => {
    const props = handlers();
    const user = renderPanel(
      <ParticipantPanel participants={[]} pending={false} {...props} />,
    );

    const input = screen.getAllByRole("textbox")[0];
    await user.type(input, "Cường");
    await user.keyboard("{Enter}");

    await waitFor(() =>
      expect(props.onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: "Cường" })),
    );
  });

  it("sua tai khoan nhan tien cua mot nguoi", async () => {
    const props = handlers();
    const user = renderPanel(
      <ParticipantPanel participants={makeDetail().participants} pending={false} {...props} />,
    );

    await user.click(screen.getByRole("button", { name: "Sửa An" }));
    const accountNo = screen.getByDisplayValue("0123456789");
    await user.clear(accountNo);
    await user.type(accountNo, "999");
    await user.keyboard("{Enter}");

    await waitFor(() =>
      expect(props.onUpdate).toHaveBeenCalledWith(AN, expect.objectContaining({ accountNo: "999" })),
    );
  });

  it("dua mot nguoi len tren / xuong duoi", async () => {
    const props = handlers();
    const user = renderPanel(
      <ParticipantPanel participants={makeDetail().participants} pending={false} {...props} />,
    );

    await user.click(screen.getByRole("button", { name: "Đưa Bình lên" }));

    expect(props.onReorder).toHaveBeenCalledWith([BINH, AN]);
  });

  it("nguoi dau danh sach khong the len them", async () => {
    const props = handlers();
    const user = renderPanel(
      <ParticipantPanel participants={makeDetail().participants} pending={false} {...props} />,
    );

    await user.click(screen.getByRole("button", { name: "Đưa An lên" }));

    expect(props.onReorder).not.toHaveBeenCalled();
  });

  it("xoa mot nguoi sau khi xac nhan", async () => {
    const props = handlers();
    const user = renderPanel(
      <ParticipantPanel participants={makeDetail().participants} pending={false} {...props} />,
    );

    await user.click(screen.getByRole("button", { name: "Xóa An" }));
    await confirmDialog(user);

    await waitFor(() => expect(props.onRemove).toHaveBeenCalledWith(AN));
  });
});

describe("PhotoViewer", () => {
  const base = {
    photo: makePhoto({ id: "photo_1", caption: "Hoá đơn" }),
    detail: { ...makePhoto({ id: "photo_1" }), data: "AAAA" },
    index: 0,
    total: 2,
    onPrev: vi.fn(),
    onNext: vi.fn(),
    onClose: vi.fn(),
  };

  it("hien anh dang xem va so thu tu", () => {
    renderPanel(<PhotoViewer {...base} />);

    expect(screen.getByText(/1\s*\/\s*2/)).toBeInTheDocument();
  });

  it("chuyen anh truoc/sau bang nut", async () => {
    const onNext = vi.fn();
    const onPrev = vi.fn();
    const user = renderPanel(<PhotoViewer {...base} onNext={onNext} onPrev={onPrev} />);

    await user.click(screen.getByRole("button", { name: "Ảnh sau" }));
    await user.click(screen.getByRole("button", { name: "Ảnh trước" }));

    expect(onNext).toHaveBeenCalled();
    expect(onPrev).toHaveBeenCalled();
  });

  it("chuyen anh bang phim mui ten", async () => {
    const onNext = vi.fn();
    const onPrev = vi.fn();
    const user = renderPanel(<PhotoViewer {...base} onNext={onNext} onPrev={onPrev} />);

    await user.keyboard("{ArrowRight}{ArrowLeft}");

    expect(onNext).toHaveBeenCalled();
    expect(onPrev).toHaveBeenCalled();
  });

  it("Esc dong lop xem anh", async () => {
    const onClose = vi.fn();
    const user = renderPanel(<PhotoViewer {...base} onClose={onClose} />);

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalled();
  });

  it("chua co anh goc thi tam hien ban thu nho", () => {
    renderPanel(<PhotoViewer {...base} detail={undefined} />);

    expect(screen.getByRole("img")).toHaveAttribute("src", expect.stringContaining("base64"));
  });

  it("chi hien nut xoa khi duoc phep xoa", async () => {
    const onDelete = vi.fn();
    const user = renderPanel(<PhotoViewer {...base} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: "Xóa ảnh" }));

    expect(onDelete).toHaveBeenCalled();
  });

  it("ban chi doc thi khong co nut xoa", () => {
    renderPanel(<PhotoViewer {...base} />);

    expect(screen.queryByRole("button", { name: "Xóa ảnh" })).toBeNull();
  });

  it("sua chu thich roi luu", async () => {
    const onSaveCaption = vi.fn(async () => {});
    const user = renderPanel(<PhotoViewer {...base} onSaveCaption={onSaveCaption} />);

    await user.click(screen.getByRole("button", { name: "Sửa chú thích" }));
    const input = screen.getByRole("textbox");
    await user.clear(input);
    await user.type(input, "Hoá đơn quán");
    await user.click(screen.getByRole("button", { name: "Lưu chú thích" }));

    await waitFor(() => expect(onSaveCaption).toHaveBeenCalledWith("Hoá đơn quán"));
  });

  it("huy sua chu thich thi giu nguyen", async () => {
    const onSaveCaption = vi.fn(async () => {});
    const user = renderPanel(<PhotoViewer {...base} onSaveCaption={onSaveCaption} />);

    await user.click(screen.getByRole("button", { name: "Sửa chú thích" }));
    await user.click(screen.getByRole("button", { name: "Hủy sửa chú thích" }));

    expect(onSaveCaption).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("bam dong thi goi onClose", async () => {
    const onClose = vi.fn();
    const user = renderPanel(<PhotoViewer {...base} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Đóng ảnh" }));

    expect(onClose).toHaveBeenCalled();
  });
});
