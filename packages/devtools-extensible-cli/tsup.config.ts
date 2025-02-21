import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['./index.ts', './cli/index.ts'],
    outDir: 'dist',
    format: ['cjs'],
    target: 'node16',
    platform: 'node',
    sourcemap: false,
    splitting: false,
    clean: true,
    dts: true,
})
