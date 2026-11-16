import { defineConfig } from "drizzle-kit";

// Carregado via `node --env-file=.env` (ver scripts db:* no package.json).
export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
