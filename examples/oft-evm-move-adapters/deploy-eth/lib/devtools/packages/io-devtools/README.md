<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<h1 align="center">@layerzerolabs/io-devtools</h1>

<!-- The badges section -->
<p align="center">
  <!-- Shields.io NPM published package version -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/io-devtools"><img alt="NPM Version" src="https://img.shields.io/npm/v/@layerzerolabs/io-devtools"/></a>
  <!-- Shields.io NPM downloads -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/io-devtools"><img alt="Downloads" src="https://img.shields.io/npm/dm/@layerzerolabs/io-devtools"/></a>
  <!-- Shields.io license badge -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/io-devtools"><img alt="NPM License" src="https://img.shields.io/npm/l/@layerzerolabs/io-devtools"/></a>
</p>

## Installation

```bash
pnpm install @layerzerolabs/io-devtools
```

```bash
yarn install @layerzerolabs/io-devtools
```

```bash
npm install @layerzerolabs/io-devtools
```

## API Documentation

### Filesystem utilities

#### isDirectory(path)

Returns `true` if specified filesystem `path` points to a directory, `false` otherwise. Does not throw if `path` does not exist on the filesystem, instead returns `false`

#### isFile(path)

Returns `true` if specified filesystem `path` points to a file, `false` otherwise. Does not throw if `path` does not exist on the filesystem, instead returns `false`

#### isReadable(path)

Returns `true` if specified filesystem `path` can be read by the current user, `false` otherwise. Does not throw if `path` does not exist on the filesystem, instead returns `false`

### Standard input/output utilities

#### promptToContinue([message, defaultValue])

Asks the user whether they want to continue and reads the input from the CLI standard input. By default the question displayed is `Do you want to continue?` and the default response is `yes`

```typescript
const goahead = await promptToContinue();

// To ask a different question
const goahead = await promptToContinue("Are you sure?");

// To default the response to false, good for important and unsafe decisions
const goahead = await promptToContinue("Are you sure?", false);
```
