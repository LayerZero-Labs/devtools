import { defineConfig } from "tsup"

export default defineConfig({
    entry: ["src/index.tsx"],
    outDir: "./dist",
    clean: true,
    dts: false,
    sourcemap: false,
    splitting: false,
    treeshake: true,
    format: ["esm"],
    env: {
        NODE_ENV: "production",
    },
    // This needs to be included for the CommonJS interoperability to work
    //
    // See https://github.com/evanw/esbuild/issues/1921
    banner: {
        js: `import { createRequire as _createRequire } from 'node:module'; const require = _createRequire(import.meta.url);`,
    },
    external: ["yoga-wasm-web"],
})
