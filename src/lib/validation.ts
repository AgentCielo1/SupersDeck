import { z } from "zod";
import { NextResponse } from "next/server";

/**
 * Parse + validate a JSON request body against a Zod schema. Returns the typed,
 * validated data — or a 400 NextResponse to return immediately on bad input.
 * Use at the top of every route/action that accepts a body, so unvalidated
 * user input never reaches the database (Cielo Platform Standard §6).
 *
 *   const parsed = await parseJson(request, MySchema);
 *   if (parsed.response) return parsed.response;
 *   const body = parsed.data; // typed + validated
 */
export async function parseJson<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<{ data: z.infer<T>; response?: undefined } | { data?: undefined; response: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { response: NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }) };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      response: NextResponse.json(
        { error: "Invalid input.", details: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) },
        { status: 400 },
      ),
    };
  }
  return { data: result.data };
}

// Small reusable field builders (bounded strings so no unbounded input hits the DB).
export const str = (max = 500) => z.string().trim().max(max);
export const reqStr = (max = 500) => z.string().trim().min(1).max(max);
export const optStr = (max = 500) => str(max).optional().nullable();
