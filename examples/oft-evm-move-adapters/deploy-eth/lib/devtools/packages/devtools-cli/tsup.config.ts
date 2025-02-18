import { defineConfig } from 'tsup'

export default defineConfig([
    {
        entry: ['src/cli.ts'],
        outDir: './dist',
        dts: false,
        minify: false,
        sourcemap: false,
        splitting: false,
        treeshake: true,
        format: ['cjs'],
        env: {
            NODE_ENV: 'production',
        },
        external: ['yoga-layout-prebuilt'],
    },
    {
        entry: ['src/index.ts'],
        outDir: './dist',
        dts: true,
        sourcemap: true,
        splitting: false,
        treeshake: true,
        format: ['cjs', 'esm'],
    },
])
