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

  it("xoa mot nguoi sau khi xac nhan", async () => {
    const props = handlers();
    const user = renderPanel(
      <ParticipantPanel participants={makeDetail().participants} pending={false} {...props} />,
    );

    await user.click(screen.getAllByRole("button", { name: /Xóa/ })[0]);
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

  it("chuyen anh truoc/sau", async () => {
    const onNext = vi.fn();
    const onPrev = vi.fn();
    const user = renderPanel(<PhotoViewer {...base} onNext={onNext} onPrev={onPrev} />);

    await user.click(screen.getByRole("button", { name: /sau|tiếp/i }));
    await user.click(screen.getByRole("button", { name: /trước/i }));

    expect(onNext).toHaveBeenCalled();
    expect(onPrev).toHaveBeenCalled();
  });

  it("bam dong thi goi onClose", async () => {
    const onClose = vi.fn();
    const user = renderPanel(<PhotoViewer {...base} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Đóng ảnh" }));

    expect(onClose).toHaveBeenCalled();
  });
});
