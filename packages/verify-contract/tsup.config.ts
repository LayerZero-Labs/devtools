import { defineConfig } from 'tsup'
import { copy } from 'esbuild-plugin-copy'

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
        entry: ['src/cli.ts'],
        outDir: './dist',
        clean: true,
        splitting: false,
        treeshake: true,
        minify: true,
        format: ['cjs'],
        esbuildPlugins: [
            copy({
                resolveFrom: 'cwd',
                assets: {
                    from: ['./node_modules/@solidity-parser/parser/dist/antlr/*'],
                    to: ['./dist/antlr'],
                },
            }),
        ],
    },
])
