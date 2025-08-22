import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/index.ts', 'src/cli.ts'],
    outDir: './dist',
    clean: true,
    dts: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    format: ['cjs', 'esm'],
})
