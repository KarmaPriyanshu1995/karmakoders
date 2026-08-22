import { defineConfig } from "vitest/config";
import path from "path";

const dirname = import.meta.dirname;

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
      "server-only": path.resolve(dirname, "./vitest.stubs/server-only.ts"),
    },
  },
});
