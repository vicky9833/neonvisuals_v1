import { defineConfig } from "vitest/config";

export default defineConfig({
  // Native TS path-alias resolution (e.g. `@/…` from tsconfig.json) so tests
  // can import source modules the same way the app does.
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    // Node environment: the pipeline scripts and pure logic under test are
    // filesystem/data utilities, not browser components.
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.ts"],
    // Property-based tests (fast-check) run >= 100 iterations each; allow
    // ample time so a full run never times out.
    testTimeout: 30_000,
  },
});
