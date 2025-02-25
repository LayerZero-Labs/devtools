import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/index.ts'],
    // in most cases, we want to support both cjs and esm
    format: ['cjs', 'esm'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    target: 'node16',
})
