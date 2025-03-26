import { defineConfig } from 'tsup'

export default defineConfig([
    {
        entry: ['src/index.ts', 'src/cli.ts'],
        outDir: './dist',
        clean: true,
        dts: true,
        minify: true,
        sourcemap: false,
        splitting: false,
        treeshake: true,
        format: ['esm', 'cjs'],
    },
])
