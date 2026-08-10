import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma 7 client for SupersDeck (Cielo Platform Standard). Connects to the izfz
 * project via the POOLED Supavisor URL (DATABASE_URL, :6543) through a driver
 * adapter — no Rust engine.
 *
 * IMPORTANT: connects with a privileged role and BYPASSES Supabase RLS. Never
 * call `prisma` raw from routes/components — go through the scoped helpers in
 * src/lib/data/, gated by the existing src/lib/authz.ts requireRole RBAC layer
 * (the §2a model — it stays intact). RLS stays ON in the DB as a defense-in-depth
 * backstop. The Supabase client remains for auth + storage only.
 *
 * PII NOTE: this app holds real Forest Hills tenant data. Helpers must never log
 * row contents; keep Prisma log level at warn/error only.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function makeClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
