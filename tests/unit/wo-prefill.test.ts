import { describe, expect, it } from "vitest";
import {
  directoryOutcomeMessage,
  directoryPhoneUpdate,
  newWorkOrderUrl,
  reporterPhoneSource,
  resolvePrefillBuilding,
} from "@/lib/wo-prefill";

const row = {
  buildingId: "bldg-1",
  building: "Building 1",
  apt: "5B",
  tenant: "Maria Watson",
  phone: "(718) 555-0142",
};

describe("newWorkOrderUrl", () => {
  it("carries building, unit, and reporter details as query params", () => {
    const url = newWorkOrderUrl(row);
    expect(url.startsWith("/work-orders/new?")).toBe(true);
    const q = new URLSearchParams(url.split("?")[1]);
    expect(q.get("building_id")).toBe("bldg-1");
    expect(q.get("building")).toBe("Building 1");
    expect(q.get("unit_label")).toBe("5B");
    expect(q.get("reporter_name")).toBe("Maria Watson");
    expect(q.get("reporter_phone")).toBe("(718) 555-0142");
  });

  it("omits reporter params for a vacant unit instead of sending empty strings", () => {
    const q = new URLSearchParams(
      newWorkOrderUrl({ ...row, tenant: null, phone: null }).split("?")[1],
    );
    expect(q.has("reporter_name")).toBe(false);
    expect(q.has("reporter_phone")).toBe(false);
    expect(q.get("unit_label")).toBe("5B");
  });

  it("URL-encodes names and phone formats safely", () => {
    const url = newWorkOrderUrl({
      ...row,
      tenant: "José & María O'Neil",
      apt: "5 B",
    });
    const q = new URLSearchParams(url.split("?")[1]);
    expect(q.get("reporter_name")).toBe("José & María O'Neil");
    expect(q.get("unit_label")).toBe("5 B");
  });
});

describe("resolvePrefillBuilding", () => {
  const options = [
    { id: "bldg-1", name: "Building 1" },
    { id: "bldg-2", name: "Building 2" },
  ];

  it("matches by id first", () => {
    expect(resolvePrefillBuilding(options, "bldg-2", "Building 1")).toBe("bldg-2");
  });

  it("falls back to exact name when the id is unknown (db ids diverged from seed)", () => {
    expect(
      resolvePrefillBuilding(options, "a4f0…uuid", "Building 2"),
    ).toBe("bldg-2");
  });

  it("returns undefined when nothing matches, so the select keeps its default", () => {
    expect(resolvePrefillBuilding(options, "nope", "Building 9")).toBeUndefined();
    expect(resolvePrefillBuilding(options, null, null)).toBeUndefined();
  });
});

// -----------------------------------------------------------------------------
//  BUG-351: a phone carried over from the directory is only the number on file,
//  and a work order changes the directory only on an explicit staff request.
//  (Made-up numbers on the 010 exchange, which cannot be a real line.)
// -----------------------------------------------------------------------------
describe("reporterPhoneSource", () => {
  it("is 'directory' while the phone is still the prefilled number, whatever the formatting", () => {
    expect(reporterPhoneSource("917-010-0001", "917-010-0001")).toBe("directory");
    expect(reporterPhoneSource("(917) 010-0001", "917 010 0001")).toBe("directory");
    expect(reporterPhoneSource("917-010-0001", "+1 917-010-0001")).toBe("directory");
  });
  it("is 'typed' once anyone changes it, or when nothing was prefilled", () => {
    expect(reporterPhoneSource("917-010-0001", "917-010-0002")).toBe("typed");
    expect(reporterPhoneSource("", "917-010-0003")).toBe("typed");
    expect(reporterPhoneSource(null, "917-010-0003")).toBe("typed");
  });
  it("is null when there is no phone", () => {
    expect(reporterPhoneSource("917-010-0001", "")).toBeNull();
    expect(reporterPhoneSource("917-010-0001", "   ")).toBeNull();
  });
});

describe("directoryPhoneUpdate", () => {
  const ok = {
    requested: true,
    staffMayEditDirectory: true,
    unitFound: true,
    unitOccupied: true,
    currentPhone: "917-010-0001",
    newPhone: "917-010-0002",
  };
  it("updates only on an explicit admin/super request, for an occupied unit, with a new real number", () => {
    expect(directoryPhoneUpdate(ok)).toEqual({ update: true, reason: "update", moveOldToSecond: true });
  });
  it("never updates without the explicit request: work orders do not sync on their own", () => {
    expect(directoryPhoneUpdate({ ...ok, requested: false })).toEqual({ update: false, reason: "not-requested" });
  });
  it("refuses callers who may not edit the directory (anonymous intake, porters, managers)", () => {
    expect(directoryPhoneUpdate({ ...ok, staffMayEditDirectory: false })).toEqual({ update: false, reason: "not-allowed" });
  });
  it("never writes to a vacant or unknown unit", () => {
    expect(directoryPhoneUpdate({ ...ok, unitOccupied: false }).reason).toBe("vacant-unit");
    expect(directoryPhoneUpdate({ ...ok, unitOccupied: null }).reason).toBe("vacant-unit");
    expect(directoryPhoneUpdate({ ...ok, unitFound: false }).reason).toBe("no-unit");
  });
  it("skips missing, short, test and unchanged numbers", () => {
    expect(directoryPhoneUpdate({ ...ok, newPhone: "" }).reason).toBe("no-phone");
    expect(directoryPhoneUpdate({ ...ok, newPhone: "010-0002" }).reason).toBe("test-or-short-number");
    expect(directoryPhoneUpdate({ ...ok, newPhone: "(718) 555-0142" }).reason).toBe("test-or-short-number");
    expect(directoryPhoneUpdate({ ...ok, newPhone: "(917) 010-0001" }).reason).toBe("same-as-on-file");
  });
  it("refuses the tenant's second number, this apartment's emergency contact, and another apartment's number", () => {
    expect(directoryPhoneUpdate({ ...ok, secondPhone: "917-010-0002" }).reason).toBe("already-on-file-as-second");
    expect(directoryPhoneUpdate({ ...ok, emergencyContactPhone: "(917) 010-0002" }).reason).toBe("emergency-contact-number");
    expect(directoryPhoneUpdate({ ...ok, otherUnitPhones: [null, "917-010-0030", "917 010 0002"] }).reason).toBe("on-file-for-another-unit");
  });
  it("keeps the old number: moves it to an empty second slot, otherwise leaves the move to the caller's note", () => {
    expect(directoryPhoneUpdate(ok)).toMatchObject({ update: true, moveOldToSecond: true });
    expect(directoryPhoneUpdate({ ...ok, secondPhone: "917-010-0040" })).toMatchObject({ update: true, moveOldToSecond: false });
    expect(directoryPhoneUpdate({ ...ok, currentPhone: null })).toMatchObject({ update: true, moveOldToSecond: false });
  });
});

describe("directoryOutcomeMessage", () => {
  it("says nothing when the directory was updated or already had the number", () => {
    expect(directoryOutcomeMessage("update")).toBeNull();
    expect(directoryOutcomeMessage("same-as-on-file")).toBeNull();
    expect(directoryOutcomeMessage("not-requested")).toBeNull();
  });
  it("explains every refusal in plain words", () => {
    for (const r of ["not-allowed", "no-unit", "vacant-unit", "no-phone", "test-or-short-number", "already-on-file-as-second",
      "emergency-contact-number", "on-file-for-another-unit", "error"] as const) {
      expect(directoryOutcomeMessage(r)).toMatch(/\w{4,}/);
    }
  });
});
