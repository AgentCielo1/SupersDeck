import { describe, expect, it } from "vitest";
import {
  INTAKE_DRAFT_MAX_AGE_MS,
  clearIntakeDraft,
  intakeDraftWorthKeeping,
  loadIntakeDraft,
  saveIntakeDraft,
  type IntakeDraftFields,
} from "./draft";

const KEY = "test:intake-draft";

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

const fields: IntakeDraftFields = {
  name: "Maria Watson",
  apt: "7C",
  phone: "(718) 555-0142",
  email: "maria@example.com",
  category: "no-heat",
  description: "Radiator cold since last night.",
};

const empty: IntakeDraftFields = {
  name: "",
  apt: "",
  phone: "",
  email: "",
  category: "",
  description: "",
};

describe("intakeDraftWorthKeeping", () => {
  it("keeps a draft as soon as ANY field has content — there is no prefill on intake", () => {
    expect(intakeDraftWorthKeeping(empty)).toBe(false);
    for (const key of Object.keys(empty) as Array<keyof IntakeDraftFields>) {
      expect(intakeDraftWorthKeeping({ ...empty, [key]: "x" })).toBe(true);
    }
    expect(intakeDraftWorthKeeping({ ...empty, name: "   " })).toBe(false);
  });
});

describe("saveIntakeDraft / loadIntakeDraft", () => {
  it("round-trips every field", () => {
    const s = memStorage();
    saveIntakeDraft(s, KEY, fields, 1000);
    const back = loadIntakeDraft(s, KEY, 2000);
    expect(back).toMatchObject(fields);
    expect(back?.savedAt).toBe(1000);
  });

  it("removes a stored draft when the tenant empties the form again", () => {
    const s = memStorage();
    saveIntakeDraft(s, KEY, fields, 1000);
    saveIntakeDraft(s, KEY, empty, 2000);
    expect(s.has(KEY)).toBe(false);
    expect(loadIntakeDraft(s, KEY, 3000)).toBeNull();
  });

  it("expires drafts after 48h and removes them", () => {
    const s = memStorage();
    saveIntakeDraft(s, KEY, fields, 0);
    expect(loadIntakeDraft(s, KEY, INTAKE_DRAFT_MAX_AGE_MS + 1)).toBeNull();
    expect(s.has(KEY)).toBe(false);
  });

  it("discards corrupt storage contents", () => {
    const s = memStorage();
    s.setItem(KEY, "{not json");
    expect(loadIntakeDraft(s, KEY)).toBeNull();
    s.setItem(KEY, JSON.stringify({ savedAt: "yesterday" }));
    expect(loadIntakeDraft(s, KEY)).toBeNull();
    expect(s.has(KEY)).toBe(false);
  });

  it("keys are independent — one building's draft never leaks into another's", () => {
    const s = memStorage();
    saveIntakeDraft(s, "app:intake:bldg-1", fields, 1000);
    expect(loadIntakeDraft(s, "app:intake:bldg-2", 2000)).toBeNull();
    expect(loadIntakeDraft(s, "app:intake:bldg-1", 2000)).toMatchObject(fields);
  });

  it("clearIntakeDraft removes the draft", () => {
    const s = memStorage();
    saveIntakeDraft(s, KEY, fields, 1000);
    clearIntakeDraft(s, KEY);
    expect(loadIntakeDraft(s, KEY, 2000)).toBeNull();
  });
});
