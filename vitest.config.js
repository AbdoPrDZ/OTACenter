import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./resources/js", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./resources/js/test/setup.ts"],
    css: false,
    include: ["resources/js/**/*.{test,spec}.{ts,tsx}"],
  },
});
