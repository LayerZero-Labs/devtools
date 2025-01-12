import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['cli/init.ts'],
    outDir: './dist',
    clean: true,
    dts: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    format: ['esm', 'cjs'],
})
