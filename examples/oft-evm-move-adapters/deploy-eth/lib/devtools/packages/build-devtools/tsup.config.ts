import { defineConfig } from 'tsup'
import { createDeclarationBuild } from '@/tsup'

export default defineConfig({
    entry: ['src/index.ts'],
    outDir: './dist',
    clean: true,
    dts: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    format: ['esm', 'cjs'],
    plugins: [createDeclarationBuild({})],
})
