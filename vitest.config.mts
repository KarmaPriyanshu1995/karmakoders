import { defineConfig } from "vitest/config";
import path from "path";

const dirname = import.meta.dirname;

const INTEGRATION = ["src/**/*.integration.test.ts", "tests/**/*.integration.test.ts"];

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    testTimeout: 30000,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
          exclude: ["**/node_modules/**", ...INTEGRATION],
          sequence: { groupOrder: 0 },
        },
      },
      {
        // DB integration suites reset shared platform_* / sign_* tables, so they must never
        // overlap: run after the unit group, one file at a time.
        extends: true,
        test: {
          name: "integration",
          include: INTEGRATION,
          fileParallelism: false,
          maxWorkers: 1,
          testTimeout: 60000,
          sequence: { groupOrder: 1 },
        },
      },
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
      "server-only": path.resolve(dirname, "./vitest.stubs/server-only.ts"),
    },
  },
});
