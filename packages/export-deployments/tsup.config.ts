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
        format: ['cjs', 'esm'],
    },
    {
        entry: ['src/cli.ts'],
        outDir: './dist',
        clean: true,
        dts: false,
        minify: true,
        sourcemap: false,
        splitting: false,
        treeshake: true,
        format: ['cjs'],
    },
])
