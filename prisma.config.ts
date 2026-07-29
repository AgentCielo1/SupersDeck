import { defineConfig, env } from "prisma/config";

// Prisma 7 config. Introspection/migrations use the DIRECT connection (:5432);
// runtime uses the pooled DATABASE_URL via @prisma/adapter-pg in src/lib/prisma.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DIRECT_URL") },
});
