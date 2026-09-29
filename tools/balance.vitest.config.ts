import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["tools/balance-sim.test.ts"], testTimeout: 120_000 },
});
