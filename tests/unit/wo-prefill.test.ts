import { describe, expect, it } from "vitest";
import { newWorkOrderUrl, resolvePrefillBuilding } from "@/lib/wo-prefill";

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
