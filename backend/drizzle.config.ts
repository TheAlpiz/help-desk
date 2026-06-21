import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/modules/**/*.schema.ts",
  out: "./src/infra/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      "postgresql://postgres:postgres@localhost:5432/help-desk",
  },
});
