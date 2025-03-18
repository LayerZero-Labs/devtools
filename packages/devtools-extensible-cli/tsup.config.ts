import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['index.ts'],
    outDir: './dist',
    clean: true,
    dts: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    format: ['esm', 'cjs'],
})
