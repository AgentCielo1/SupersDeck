import { describe, expect, it } from "vitest";
import { WO_CATEGORIES, categoryTitle } from "@/lib/wo-categories";

// Must stay aligned with ALLOWED_CATEGORIES in src/app/api/work-orders/route.ts
// (not imported — the route module drags in server-only dependencies).
const API_ALLOWED = [
  "no-heat", "no-hot-water", "leak", "electrical", "appliance",
  "lock-key", "pest", "mold", "elevator", "intercom",
  "common-area", "lead-concern", "other",
];

describe("WO_CATEGORIES", () => {
  it("covers exactly the API's allowed categories, each once", () => {
    const keys = WO_CATEGORIES.map((c) => c.key);
    expect(keys.sort()).toEqual([...API_ALLOWED].sort());
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps the five HPD-risk categories as distinct buttons", () => {
    const keys = new Set(WO_CATEGORIES.map((c) => c.key));
    for (const hpd of ["no-heat", "no-hot-water", "leak", "mold", "lead-concern"]) {
      expect(keys.has(hpd)).toBe(true);
    }
  });

  it("every category has a label, an icon, and title text", () => {
    for (const c of WO_CATEGORIES) {
      expect(c.label.trim()).not.toBe("");
      expect(c.icon.trim()).not.toBe("");
      expect(c.titleText.trim()).not.toBe("");
    }
  });
});

describe("categoryTitle", () => {
  it("seeds the title with the category phrase, adding the apartment when set", () => {
    expect(categoryTitle("no-heat", "")).toBe("No heat");
    expect(categoryTitle("no-heat", " 7C ")).toBe("No heat — Apt 7C");
    // "other" uses the server's derived-title phrasing, not the button label.
    expect(categoryTitle("other", "")).toBe("Repair request");
  });

  it("returns empty for an unknown key so a bad tap never writes garbage", () => {
    expect(categoryTitle("not-a-category", "7C")).toBe("");
    expect(categoryTitle("", "")).toBe("");
  });
});
