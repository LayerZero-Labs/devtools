import { defineConfig } from 'tsup';

export default defineConfig({
    // -------------------------------------------------------------------------
    // Input / Output
    // -------------------------------------------------------------------------
    entry: ['src/index.tsx'],
    outDir: './dist',
    clean: true, // Clean the output directory before building to remove stale files.

    // -------------------------------------------------------------------------
    // Formats & Compatibility
    // -------------------------------------------------------------------------
    // CRITICAL: Generate both CommonJS (legacy) and ESM (modern) bundles.
    // ESM is essential for tree-shaking in modern bundlers like Vite/Webpack.
    format: ['cjs', 'esm'],
    
    // Target environment (es2020 is a safe modern default, adjust if you need IE11)
    target: 'es2020',

    // -------------------------------------------------------------------------
    // Types & Debugging
    // -------------------------------------------------------------------------
    // CRITICAL: Generate declaration files (.d.ts) so consumers get type safety/IntelliSense.
    dts: true,

    // Enable sourcemaps to make debugging possible in production environments.
    sourcemap: true,

    // -------------------------------------------------------------------------
    // Optimization
    // -------------------------------------------------------------------------
    // Code splitting helps share common code between multiple entry points (if any).
    splitting: true,

    // Tree-shaking removes unused code from the final bundle.
    treeshake: true,

    // Minification reduces bundle size. 
    // NOTE: Some library authors prefer 'false' to let the consumer app handle minification.
    // We keep it 'true' per your original config, but ensure sourcemaps are on.
    minify: true,

    // -------------------------------------------------------------------------
    // Environment & Externals
    // -------------------------------------------------------------------------
    // Inject process.env.NODE_ENV for optimizations in libraries (e.g. removing dev warnings).
    env: {
        NODE_ENV: 'production',
    },

    // Externalize dependencies that should not be bundled (e.g. binary deps).
    external: ['yoga-layout-prebuilt'],
});
