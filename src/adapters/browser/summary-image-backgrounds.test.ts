import { describe, expect, it } from "vitest";
import {
  DEFAULT_SUMMARY_IMAGE_BACKGROUND_ID,
  getSummaryImageBackground,
  SUMMARY_IMAGE_BACKGROUNDS,
} from "./summary-image-backgrounds";

/** Canvas gia: chi ghi lai lenh ve de biet `paint` co to het khung anh khong. */
function fakeContext() {
  const rects: { x: number; y: number; width: number; height: number }[] = [];
  const gradientStops: string[] = [];

  const texts: { text: string; alpha: number }[] = [];
  let alpha = 1;
  let depth = 0;
  let maxDepth = 0;

  const context = {
    fillStyle: "" as unknown,
    font: "",
    textAlign: "",
    textBaseline: "",
    get globalAlpha() {
      return alpha;
    },
    set globalAlpha(value: number) {
      alpha = value;
    },
    fillRect(x: number, y: number, width: number, height: number) {
      rects.push({ x, y, width, height });
    },
    createLinearGradient() {
      return {
        addColorStop(_offset: number, color: string) {
          gradientStops.push(color);
        },
      };
    },
    beginPath() {},
    arc() {},
    fill() {},
    fillText(text: string) {
      texts.push({ text, alpha });
    },
    save() {
      depth += 1;
      maxDepth = Math.max(maxDepth, depth);
    },
    restore() {
      depth -= 1;
    },
    translate() {},
    rotate() {},
  };

  return {
    context: context as unknown as CanvasRenderingContext2D,
    rects,
    gradientStops,
    texts,
    /** Sau khi ve xong phai ve 0: save/restore lech la ro ra ca anh. */
    balance: () => depth,
    maxDepth: () => maxDepth,
  };
}

describe("SUMMARY_IMAGE_BACKGROUNDS", () => {
  it("id khong trung nhau va nen mac dinh nam trong danh sach", () => {
    const ids = SUMMARY_IMAGE_BACKGROUNDS.map((background) => background.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(DEFAULT_SUMMARY_IMAGE_BACKGROUND_ID);
  });

  it("moi nen khai bao du mau chu, nhan va o xem truoc", () => {
    for (const background of SUMMARY_IMAGE_BACKGROUNDS) {
      expect(background.label).not.toBe("");
      expect(background.hint).not.toBe("");
      expect(background.preview).not.toBe("");

      const { qrMat, ...colors } = background.palette;
      for (const [key, value] of Object.entries(colors)) {
        expect(value, `${background.id}.${key}`).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it("nen toi lot nen trang sau QR, nen sang thi khong", () => {
    const dark = getSummaryImageBackground("dem");
    const light = getSummaryImageBackground("trang");

    expect(dark.palette.qrMat).toBe("#ffffff");
    expect(light.palette.qrMat).toBeNull();
  });

  it("paint to kin toan bo khung anh", () => {
    for (const background of SUMMARY_IMAGE_BACKGROUNDS) {
      const { context, rects } = fakeContext();
      background.paint(context, 760, 1000);

      expect(rects[0], background.id).toEqual({ x: 0, y: 0, width: 760, height: 1000 });
    }
  });

  /** Tuong phan theo WCAG 2.1: (L1 + 0.05) / (L2 + 0.05) voi L la do sang tuong doi. */
  function contrastRatio(a: string, b: string) {
    const luminance = (hex: string) => {
      const channels = [1, 3, 5].map((offset) => {
        const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    };

    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (light + 0.05) / (dark + 0.05);
  }

  it("moi mau chu du tuong phan tren moi mau nen cua chinh no", () => {
    // Anh nay duoc dan sang Zalo/Messenger va xem tren dien thoai ngoai nang,
    // nen giu nguong AA: 4.5 cho chu thuong, 3.0 cho chu to va chu phu.
    const MIN_BODY = 4.5;
    const MIN_LARGE = 3;

    for (const background of SUMMARY_IMAGE_BACKGROUNDS) {
      for (const base of background.baseColors) {
        const check = (key: string, color: string, min: number) => {
          const ratio = contrastRatio(color, base);
          expect(
            ratio,
            `${background.id}: ${key} ${color} tren nen ${base} chi duoc ${ratio.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(min);
        };

        check("body", background.palette.body, MIN_BODY);
        check("muted", background.palette.muted, MIN_BODY);
        check("title", background.palette.title, MIN_LARGE);
        check("heading", background.palette.heading, MIN_LARGE);
        check("subtitle", background.palette.subtitle, MIN_LARGE);
        check("accent", background.palette.accent, MIN_LARGE);
      }
    }
  });

  it("nen mac dinh rac emoji cau long mo, va tra canvas ve nguyen trang thai", () => {
    const { context, texts, balance } = fakeContext();
    const background = getSummaryImageBackground(DEFAULT_SUMMARY_IMAGE_BACKGROUND_ID);

    background.paint(context, 760, 1000);

    expect(background.id).toBe("cau-long");
    expect(texts.length).toBeGreaterThan(10);
    expect(texts.some((entry) => entry.text === "🏸")).toBe(true);
    // Hoa van phai mo hon han chu, khong thi doc so tien khong noi.
    for (const entry of texts) expect(entry.alpha).toBeLessThan(0.25);
    expect(balance()).toBe(0);
  });

  it("id la khong ro thi ve nen mac dinh chu khong vo", () => {
    expect(getSummaryImageBackground("khong-ton-tai").id).toBe(
      DEFAULT_SUMMARY_IMAGE_BACKGROUND_ID,
    );
    expect(getSummaryImageBackground(undefined).id).toBe(DEFAULT_SUMMARY_IMAGE_BACKGROUND_ID);
  });
});
