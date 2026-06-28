import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // env.ts validates required vars at import time. Provide harmless test values so
    // importing modules under test (which pull in infra/env) doesn't fail-fast.
    env: {
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/help-desk-test",
      NODE_ENV: "test",
      GITHUB_APP_WEBHOOK_SECRET: "test-webhook-secret",
    },
    include: ["src/**/*.test.ts"],
  },
});
