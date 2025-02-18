<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<h1 align="center">build-lz-options</h1>

<!-- The badges section -->
<p align="center">
  <!-- Shields.io NPM published package version -->
  <a href="https://www.npmjs.com/package/build-lz-options"><img alt="NPM Version" src="https://img.shields.io/npm/v/build-lz-options"/></a>
  <!-- Shields.io NPM downloads -->
  <a href="https://www.npmjs.com/package/build-lz-options"><img alt="Downloads" src="https://img.shields.io/npm/dm/build-lz-options"/></a>
  <!-- Shields.io license badge -->
  <a href="https://www.npmjs.com/package/build-lz-options"><img alt="NPM License" src="https://img.shields.io/npm/l/build-lz-options"/></a>
</p>

## Create LayerZero OApp Options <img alt="Static Badge" src="https://img.shields.io/badge/status-work_in_progress-yellow">

This package provides a convenient way to build and serialize Options for LayerZero OApps.

```bash
npx build-lz-options@latest
# or
yarn build-lz-options
# or
pnpm build-lz-options
# or
bunx build-lz-options
```

## :warning: Known Warnings

### Options do not specify any lzReceive gas

The default LayerZero ExecutorFeeLib requires the sum of lzReceive gas for all Options for a message is a positive
integer. This is classified as a warning and not an error, as `build-lz-options` tool is not aware of the context in
which the generated Options are used. For example, Options may be combined elsewhere in the application, perhaps with
OApp Enforced Options, and the result will have a positive lzReceive gas sum.

### PreCrime Verifier Option is not supported by the default LayerZero DVN. Please ensure the DVN you have specified supports this option.

The default LayerZero DVN does not currently support the Verifier PreCrime option. If you specify this option, please
ensure that the DVN you are using supports PreCrime.
