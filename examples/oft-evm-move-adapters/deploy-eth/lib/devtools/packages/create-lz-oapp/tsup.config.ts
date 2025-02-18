import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/index.tsx'],
    outDir: './dist',
    clean: true,
    dts: false,
    minify: true,
    sourcemap: false,
    splitting: false,
    treeshake: true,
    format: ['cjs'],
    env: {
        NODE_ENV: 'production',
    },
    external: ['yoga-layout-prebuilt'],
})
