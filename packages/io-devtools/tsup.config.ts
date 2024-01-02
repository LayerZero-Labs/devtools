import { defineConfig } from 'tsup'

export default defineConfig({
    entry: [
        'src/index.ts',
        'src/filesystem/index.ts',
        'src/filesystem/index.ts',
        'src/stdio/index.ts',
        // Swag will not be a part of the root bundle because it brings too many dependencies
        // so if not used, it would just bloat the package size
        //
        // See `src/swag/README.md for usage notes
        'src/swag/index.ts',
    ],
    outDir: './dist',
    clean: true,
    dts: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    format: ['esm', 'cjs'],
    external: ['yoga-layout-prebuilt'],
})
