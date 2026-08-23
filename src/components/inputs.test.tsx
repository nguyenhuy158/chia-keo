// Cac o nhap dung chung: MoneyInput, BankSelect, PhotoGrid.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { makePhoto } from "../test/fake-game-api";
import { BankSelect } from "./BankSelect";
import { MoneyInput } from "./MoneyInput";
import { PhotoGrid } from "./PhotoGrid";

describe("MoneyInput", () => {
  function Harness({ initial = "" }) {
    const [value, setValue] = useState(initial);
    return <MoneyInput value={value} onChange={setValue} aria-label="Số tiền" />;
  }

  it("chua go gi thi khong hien dong ket qua", () => {
    render(<Harness />);

    expect(screen.queryByText(/=/)).toBeNull();
  });

  it("hien ket qua da dinh dang duoi o nhap", async () => {
    render(<Harness />);

    await userEvent.type(screen.getByLabelText("Số tiền"), "90000");

    expect(screen.getByText(/90\.000/)).toBeInTheDocument();
  });

  it("tinh duoc bieu thuc cong tru", async () => {
    render(<Harness />);

    await userEvent.type(screen.getByLabelText("Số tiền"), "20000+30000");

    expect(screen.getByText(/50\.000/)).toBeInTheDocument();
  });

  it("loc ky tu khong phai so hay phep tinh", async () => {
    render(<Harness />);
    const input = screen.getByLabelText("Số tiền");

    await userEvent.type(input, "9a0b0c00");

    expect(input).toHaveValue("90000");
  });

  it("bieu thuc chua hop le thi noi ro thay vi hien so sai", async () => {
    render(<Harness />);

    await userEvent.type(screen.getByLabelText("Số tiền"), "20000+");

    expect(screen.getByText("Biểu thức chưa hợp lệ")).toBeInTheDocument();
  });

  it("goi onBlur khi roi khoi o", async () => {
    const onBlur = vi.fn();
    render(<MoneyInput value="1000" onChange={() => {}} onBlur={onBlur} aria-label="Số tiền" />);

    await userEvent.click(screen.getByLabelText("Số tiền"));
    await userEvent.tab();

    expect(onBlur).toHaveBeenCalled();
  });
});

describe("BankSelect", () => {
  it("chua chon thi hien loi moi chon", () => {
    render(<BankSelect value="" onChange={() => {}} ariaLabel="Ngân hàng" />);

    expect(screen.getByRole("button", { name: "Ngân hàng" })).toHaveTextContent("Chọn ngân hàng");
  });

  it("nhan ca ma so lan ten viet tat", () => {
    render(<BankSelect value="vcb" onChange={() => {}} ariaLabel="Ngân hàng" />);

    expect(screen.getByRole("button", { name: "Ngân hàng" })).toHaveTextContent(/Vietcombank/i);
  });

  it("ma cu khong ro van hien lai, khong lam nguoi dung tuong mat du lieu", () => {
    // Ma go tay tu truoc, khong khop alias nao (ma 6 so thi coi nhu hop le).
    render(<BankSelect value="NGANHANGLA" onChange={() => {}} ariaLabel="Ngân hàng" />);

    expect(screen.getByRole("button", { name: "Ngân hàng" })).toHaveTextContent(
      "NGANHANGLA (không rõ)",
    );
  });

  it("chon mot ngan hang thi bao ma ra ngoai", async () => {
    const onChange = vi.fn();
    render(<BankSelect value="" onChange={onChange} ariaLabel="Ngân hàng" />);

    await userEvent.click(screen.getByRole("button", { name: "Ngân hàng" }));
    await userEvent.type(screen.getByLabelText("Tìm trong danh sách"), "vietcom");
    await userEvent.click(screen.getAllByRole("option")[0]);

    expect(onChange).toHaveBeenCalled();
  });
});

describe("PhotoGrid", () => {
  it("danh sach rong thi khong ve o nao", () => {
    render(<PhotoGrid photos={[]} onOpen={() => {}} />);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("bam mot o thi mo dung anh do", async () => {
    const onOpen = vi.fn();
    render(
      <PhotoGrid
        photos={[makePhoto({ id: "photo_1" }), makePhoto({ id: "photo_2" })]}
        onOpen={onOpen}
      />,
    );

    await userEvent.click(screen.getAllByRole("button")[1]);

    expect(onOpen).toHaveBeenCalledWith(1);
  });

  it("khong co chu thich thi dat nhan theo so thu tu", () => {
    render(<PhotoGrid photos={[makePhoto()]} onOpen={() => {}} />);

    expect(screen.getByRole("button", { name: "Ảnh 1" })).toBeInTheDocument();
  });

  it("co chu thich thi dung lam nhan", () => {
    render(<PhotoGrid photos={[makePhoto({ caption: "Hoá đơn quán" })]} onOpen={() => {}} />);

    expect(screen.getByRole("button", { name: "Hoá đơn quán" })).toBeInTheDocument();
  });

  it("anh gan voi khoan chi thi hien ten khoan chi do", () => {
    render(
      <PhotoGrid
        photos={[makePhoto({ expenseId: "expense_1" })]}
        expenseTitleById={new Map([["expense_1", "Tiền nước"]])}
        onOpen={() => {}}
      />,
    );

    expect(screen.getByText("Tiền nước")).toBeInTheDocument();
  });
});
