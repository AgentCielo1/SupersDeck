import { defineConfig } from "prisma/config";

// Prisma 7 config. Introspection/migrations use the DIRECT connection (:5432);
// runtime uses the pooled DATABASE_URL via @prisma/adapter-pg in src/lib/prisma.ts.
//
// `prisma generate` (codegen) and `tsc` must run with NO database env set — CI
// typechecks before any DB exists, and codegen never connects. The old
// `env("DIRECT_URL")` helper threw at config-load for EVERY command, so a missing
// DIRECT_URL broke generate and reddened CI for weeks. Only migrate/introspect
// actually dial the datasource; they still require a real DIRECT_URL at runtime
// and will fail to connect against the placeholder, which is the correct behavior.
const directUrl =
  process.env.DIRECT_URL ??
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: directUrl },
});
