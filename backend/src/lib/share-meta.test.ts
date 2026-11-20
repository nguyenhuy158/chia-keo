import { describe, expect, it } from "vitest";
import { buildShareMetaTags } from "./share-meta";

const PAGE_URL = "https://chiakeo.huyab.cfd/share/AbCd?utm=zalo";

describe("buildShareMetaTags", () => {
  it("points og:image at the versioned preview of the same token", () => {
    const tags = buildShareMetaTags(
      { name: "Cầu lông", previewVersion: "2026-11-11T10:00:00.000Z" },
      PAGE_URL,
    );

    expect(tags).toContain(
      'content="https://chiakeo.huyab.cfd/api/share/AbCd/preview.jpg?v=2026-11-11T10%3A00%3A00.000Z"',
    );
    expect(tags).toContain(
      '<meta property="og:url" content="https://chiakeo.huyab.cfd/share/AbCd" />',
    );
    expect(tags).toContain("summary_large_image");
  });

  it("omits image tags until a preview was uploaded", () => {
    const tags = buildShareMetaTags(
      { name: "Cầu lông", previewVersion: null },
      PAGE_URL,
    );

    expect(tags).toContain("og:title");
    expect(tags).not.toContain("og:image");
  });

  it("escapes the game name so it cannot break out of the attribute", () => {
    const tags = buildShareMetaTags(
      { name: `"><script>alert(1)</script>`, previewVersion: null },
      PAGE_URL,
    );

    expect(tags).not.toContain("<script>");
    expect(tags).toContain("&quot;&gt;&lt;script&gt;");
  });
});
