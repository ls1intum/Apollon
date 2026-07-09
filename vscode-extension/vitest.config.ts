import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      // The real `vscode` module only exists inside a VS Code process.
      vscode: fileURLToPath(new URL("./tests/vscodeStub.ts", import.meta.url)),
    },
  },
})
