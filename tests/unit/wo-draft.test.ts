import { describe, expect, it } from "vitest";
import {
  WO_DRAFT_KEY,
  WO_DRAFT_MAX_AGE_MS,
  clearWoDraft,
  loadWoDraft,
  mergeDraftWithPrefill,
  saveWoDraft,
  type WoDraftFields,
} from "@/lib/wo-draft";

function memStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => {
      m.set(k, v);
    },
    removeItem: (k: string) => {
      m.delete(k);
    },
    has: (k: string) => m.has(k),
  };
}

const fields: WoDraftFields = {
  building_id: "bldg-2",
  unit_label: "7C",
  title: "No heat in living room",
  description: "Radiator cold since last night.",
  category: "no-heat",
  priority: "high",
  reporter_name: "Maria Watson",
  reporter_phone: "(718) 555-0142",
};

describe("saveWoDraft / loadWoDraft", () => {
  it("round-trips every field", () => {
    const s = memStorage();
    saveWoDraft(s, fields, 1000);
    const back = loadWoDraft(s, 2000);
    expect(back).toMatchObject(fields);
    expect(back?.savedAt).toBe(1000);
  });

  it("does not keep a draft with no typed title or description, and deletes a stale one", () => {
    const s = memStorage();
    saveWoDraft(s, fields, 1000);
    // Super deleted their text again — the empty state must win.
    saveWoDraft(s, { ...fields, title: "  ", description: "" }, 2000);
    expect(s.has(WO_DRAFT_KEY)).toBe(false);
    expect(loadWoDraft(s, 3000)).toBeNull();
  });

  it("expires drafts after 48h and removes them", () => {
    const s = memStorage();
    saveWoDraft(s, fields, 0);
    expect(loadWoDraft(s, WO_DRAFT_MAX_AGE_MS + 1)).toBeNull();
    expect(s.has(WO_DRAFT_KEY)).toBe(false);
  });

  it("survives corrupt storage contents by discarding them", () => {
    const s = memStorage();
    s.setItem(WO_DRAFT_KEY, "{not json");
    expect(loadWoDraft(s)).toBeNull();
    s.setItem(WO_DRAFT_KEY, JSON.stringify({ savedAt: "yesterday" }));
    expect(loadWoDraft(s)).toBeNull();
    expect(s.has(WO_DRAFT_KEY)).toBe(false);
  });

  it("clearWoDraft removes the draft", () => {
    const s = memStorage();
    saveWoDraft(s, fields, 1000);
    clearWoDraft(s);
    expect(loadWoDraft(s, 2000)).toBeNull();
  });
});

describe("mergeDraftWithPrefill", () => {
  const draft = { ...fields, savedAt: 1000 };
  const valid = ["bldg-1", "bldg-2"];

  it("prefill wins for the fields it carries; draft fills the rest", () => {
    const merged = mergeDraftWithPrefill(
      draft,
      {
        building_id: "bldg-1",
        unit_label: "5B",
        reporter_name: "Joe Chen",
        reporter_phone: "(917) 555-0100",
      },
      valid,
    );
    expect(merged.building_id).toBe("bldg-1");
    expect(merged.unit_label).toBe("5B");
    expect(merged.reporter_name).toBe("Joe Chen");
    expect(merged.reporter_phone).toBe("(917) 555-0100");
    // Typed text always comes from the draft.
    expect(merged.title).toBe(fields.title);
    expect(merged.description).toBe(fields.description);
    expect(merged.category).toBe("no-heat");
    expect(merged.priority).toBe("high");
  });

  it("uses the draft where prefill is silent", () => {
    const merged = mergeDraftWithPrefill(
      draft,
      { building_id: undefined, unit_label: "", reporter_name: "", reporter_phone: "" },
      valid,
    );
    expect(merged).toMatchObject(fields);
  });

  it("drops a draft building that no longer matches an option", () => {
    const merged = mergeDraftWithPrefill(
      { ...draft, building_id: "bldg-gone" },
      { building_id: undefined, unit_label: "", reporter_name: "", reporter_phone: "" },
      valid,
    );
    expect(merged.building_id).toBe("");
  });
});
