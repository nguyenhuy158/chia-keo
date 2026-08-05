/**
 * Cac nen co san cho anh tong ket. Mot nen gom hai phan: cach ve nen (`paint`)
 * va bang mau chu di kem (`palette`) — doi nen ma khong doi mau chu thi nen toi
 * se lam chu bien mat.
 *
 * Module nay khong goi canvas luc import (chi trong `paint`) nen test chay duoc
 * o moi truong node.
 */

export type SummaryImagePalette = {
  accent: string;
  title: string;
  subtitle: string;
  heading: string;
  body: string;
  muted: string;
  divider: string;
  qrFrame: string;
  /**
   * Nen lot phia sau QR. QR cua VietQR la anh nen trang, dat thang len nen toi
   * se thanh mot o trang trong long; lot san mot mieng trang rong hon cho no
   * thanh co y. null = nen da sang, khong can lot.
   */
  qrMat: string | null;
};

export type SummaryImageBackground = {
  id: string;
  label: string;
  hint: string;
  /** CSS background cho o vuong xem truoc trong menu Copy. */
  preview: string;
  /**
   * Cac mau nen `paint` thuc su to (dau va cuoi cua gradient, mau giay...).
   * Test doi chieu mau chu voi tung mau nay de khong co nen nao lam chu kho doc.
   */
  baseColors: string[];
  palette: SummaryImagePalette;
  paint(context: CanvasRenderingContext2D, width: number, height: number): void;
};

/**
 * Mau chu dung chung cho moi nen sang. `muted` dam hon mot bac so voi mau xam
 * cua app: chu phu 13-14px tren nen co mau (kem, bac ha) chi vua du tuong phan
 * AA neu dung xam nhat — xem test tuong phan.
 */
const LIGHT_INK = {
  title: "#0c0a09",
  body: "#1c1917",
  muted: "#645d57",
} as const;

function fillSolid(color: string) {
  return (context: CanvasRenderingContext2D, width: number, height: number) => {
    context.fillStyle = color;
    context.fillRect(0, 0, width, height);
  };
}

/** Chuyen mau theo chieu doc: nhat o dau anh, dam dan xuong chan. */
function fillVerticalGradient(from: string, to: string) {
  return (context: CanvasRenderingContext2D, width: number, height: number) => {
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, from);
    gradient.addColorStop(1, to);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  };
}

const DOT_SPACING = 26;
const DOT_RADIUS = 1.4;

/** Nen giay: mau tron cong luoi cham mo cho bot phang. */
function fillDottedPaper(base: string, dot: string) {
  const solid = fillSolid(base);

  return (context: CanvasRenderingContext2D, width: number, height: number) => {
    solid(context, width, height);

    context.fillStyle = dot;
    for (let y = DOT_SPACING; y < height; y += DOT_SPACING) {
      for (let x = DOT_SPACING; x < width; x += DOT_SPACING) {
        context.beginPath();
        context.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
        context.fill();
      }
    }
  };
}

export const SUMMARY_IMAGE_BACKGROUNDS: SummaryImageBackground[] = [
  {
    id: "trang",
    label: "Trắng trơn",
    hint: "Gọn, dễ đọc ở mọi nơi",
    preview: "#ffffff",
    baseColors: ["#ffffff"],
    palette: {
      ...LIGHT_INK,
      accent: "#7c3aed",
      subtitle: "#7c3aed",
      heading: "#6d28d9",
      divider: "#e7e5e4",
      qrFrame: "#e7e5e4",
      qrMat: null,
    },
    paint: fillSolid("#ffffff"),
  },
  {
    id: "tim",
    label: "Tím nhạt",
    hint: "Cùng màu thương hiệu của app",
    preview: "linear-gradient(#faf5ff, #ede9fe)",
    baseColors: ["#faf5ff", "#ede9fe"],
    palette: {
      ...LIGHT_INK,
      accent: "#7c3aed",
      subtitle: "#6d28d9",
      heading: "#5b21b6",
      divider: "#ddd6fe",
      qrFrame: "#c4b5fd",
      qrMat: null,
    },
    paint: fillVerticalGradient("#faf5ff", "#ede9fe"),
  },
  {
    id: "kem",
    label: "Giấy kem",
    hint: "Nền ấm, có lưới chấm mờ",
    preview: "radial-gradient(#e3d6bb 1.2px, #fdfaf3 1.2px) 0 0/9px 9px",
    baseColors: ["#fdfaf3", "#ece1c9"],
    palette: {
      ...LIGHT_INK,
      accent: "#b45309",
      subtitle: "#b45309",
      heading: "#92400e",
      divider: "#e7dcc4",
      qrFrame: "#ddd0b4",
      qrMat: null,
    },
    paint: fillDottedPaper("#fdfaf3", "#ece1c9"),
  },
  {
    id: "bien",
    label: "Xanh biển",
    hint: "Mát mắt, phù hợp đi chơi biển",
    preview: "linear-gradient(#f0f9ff, #dbeafe)",
    baseColors: ["#f0f9ff", "#dbeafe"],
    palette: {
      ...LIGHT_INK,
      accent: "#0284c7",
      subtitle: "#0369a1",
      heading: "#075985",
      divider: "#bfdbfe",
      qrFrame: "#93c5fd",
      qrMat: null,
    },
    paint: fillVerticalGradient("#f0f9ff", "#dbeafe"),
  },
  {
    id: "bac-ha",
    label: "Bạc hà",
    hint: "Xanh nhạt, tươi",
    preview: "linear-gradient(#f0fdf4, #d1fae5)",
    baseColors: ["#f0fdf4", "#d1fae5"],
    palette: {
      ...LIGHT_INK,
      accent: "#059669",
      subtitle: "#047857",
      heading: "#065f46",
      divider: "#a7f3d0",
      qrFrame: "#6ee7b7",
      qrMat: null,
    },
    paint: fillVerticalGradient("#f0fdf4", "#d1fae5"),
  },
  {
    id: "dem",
    label: "Nền đêm",
    hint: "Chữ sáng trên nền tối",
    preview: "linear-gradient(#292524, #0c0a09)",
    baseColors: ["#292524", "#0c0a09"],
    palette: {
      title: "#fafaf9",
      body: "#e7e5e4",
      muted: "#a8a29e",
      accent: "#a78bfa",
      subtitle: "#c4b5fd",
      heading: "#c4b5fd",
      divider: "#292524",
      qrFrame: "#57534e",
      qrMat: "#ffffff",
    },
    paint: fillVerticalGradient("#292524", "#0c0a09"),
  },
];

export const DEFAULT_SUMMARY_IMAGE_BACKGROUND_ID = SUMMARY_IMAGE_BACKGROUNDS[0].id;

/** Id la khong ro (nguoi dung doi phien ban, localStorage cu) thi ve mac dinh. */
export function getSummaryImageBackground(id: string | undefined): SummaryImageBackground {
  return (
    SUMMARY_IMAGE_BACKGROUNDS.find((background) => background.id === id) ||
    SUMMARY_IMAGE_BACKGROUNDS[0]
  );
}

const STORAGE_KEY = "chia-keo-summary-image-bg";

/**
 * Nen la so thich rieng cua nguoi dang xem, khong phai du lieu cua cuoc chia,
 * nen luu o may chu khong dong vao DB: nguoi khac mo cung link van tu chon duoc.
 */
export function getStoredSummaryImageBackgroundId(): string {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value && SUMMARY_IMAGE_BACKGROUNDS.some((background) => background.id === value)) {
      return value;
    }
  } catch {
    // localStorage co the bi chan; dung nen mac dinh.
  }

  return DEFAULT_SUMMARY_IMAGE_BACKGROUND_ID;
}

export function storeSummaryImageBackgroundId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Bo qua neu khong luu duoc; chi mat viec ghi nho lua chon.
  }
}
