import { defineConfig } from "tsup"

export default defineConfig({
    entry: ["src/tasks/index.ts"],
    outDir: "./dist/tasks",
    clean: true,
    dts: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    format: ["esm", "cjs"],
})
