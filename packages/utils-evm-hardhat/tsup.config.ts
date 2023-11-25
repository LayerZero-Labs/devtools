import { defineConfig } from 'tsup'

export default defineConfig([
    {
        entry: ['src/index.ts'],
        outDir: './dist',
        clean: true,
        dts: true,
        sourcemap: true,
        splitting: false,
        treeshake: true,
        format: ['esm', 'cjs'],
    },
    {
        entry: ['src/type-extensions.ts'],
        outDir: './dist',
        clean: true,
        dts: true,
        sourcemap: true,
        splitting: false,
        treeshake: true,
        format: ['esm', 'cjs'],
    },
])
