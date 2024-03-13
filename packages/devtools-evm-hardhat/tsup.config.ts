import { defineConfig } from 'tsup'

export default defineConfig([
    {
        entry: ['src/index.ts', 'src/type-extensions.ts', 'src/tasks/index.ts'],
        outDir: './dist',
        clean: true,
        dts: true,
        sourcemap: true,
        splitting: false,
        treeshake: true,
        format: ['esm', 'cjs'],
        loader: {
            '.conf': 'text',
        },
    },
])
