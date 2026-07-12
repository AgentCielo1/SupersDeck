import { describe, expect, it } from "vitest";
import { z } from "zod";
import { optStr, parseJson, reqStr, str } from "../../src/lib/validation";

const Schema = z.object({ name: reqStr(20), notes: optStr(50) });

function jsonRequest(body: string): Request {
  return new Request("http://x/api/test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("parseJson", () => {
  it("returns typed data for a valid body (and trims bounded strings)", async () => {
    const parsed = await parseJson(jsonRequest(JSON.stringify({ name: "  Boiler room  " })), Schema);
    expect(parsed.response).toBeUndefined();
    expect(parsed.data).toEqual({ name: "Boiler room" });
  });

  it("returns a 400 response for malformed JSON, never throwing", async () => {
    const parsed = await parseJson(jsonRequest("{not json"), Schema);
    expect(parsed.data).toBeUndefined();
    expect(parsed.response!.status).toBe(400);
    expect(await parsed.response!.json()).toEqual({ error: "Invalid JSON body." });
  });

  it("returns a 400 with per-field details when the schema rejects", async () => {
    const parsed = await parseJson(jsonRequest(JSON.stringify({ name: "" })), Schema);
    expect(parsed.data).toBeUndefined();
    expect(parsed.response!.status).toBe(400);
    const body = await parsed.response!.json();
    expect(body.error).toBe("Invalid input.");
    expect(body.details.some((d: string) => d.startsWith("name:"))).toBe(true);
  });

  it("rejects oversized input so unbounded strings never reach the DB", async () => {
    const parsed = await parseJson(jsonRequest(JSON.stringify({ name: "x".repeat(21) })), Schema);
    expect(parsed.response!.status).toBe(400);
  });
});

describe("field builders", () => {
  it("reqStr requires non-empty after trimming; str allows empty", () => {
    expect(reqStr().safeParse("   ").success).toBe(false);
    expect(str().safeParse("").success).toBe(true);
  });

  it("optStr accepts undefined and null", () => {
    expect(optStr().safeParse(undefined).success).toBe(true);
    expect(optStr().safeParse(null).success).toBe(true);
    expect(optStr(3).safeParse("abcd").success).toBe(false);
  });
});
