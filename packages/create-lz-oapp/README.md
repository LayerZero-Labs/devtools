<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<h1 align="center">create-lz-oapp</h1>

<!-- The badges section -->
<p align="center">
  <!-- Shields.io NPM published package version -->
  <a href="https://www.npmjs.com/package/create-lz-oapp"><img alt="NPM Version" src="https://img.shields.io/npm/v/create-lz-oapp"/></a>
  <!-- Shields.io NPM downloads -->
  <a href="https://www.npmjs.com/package/create-lz-oapp"><img alt="Downloads" src="https://img.shields.io/npm/dm/create-lz-oapp"/></a>
  <!-- Shields.io license badge -->
  <a href="https://www.npmjs.com/package/create-lz-oapp"><img alt="NPM License" src="https://img.shields.io/npm/l/create-lz-oapp"/></a>
</p>

## Create LayerZero OApp <img alt="Static Badge" src="https://img.shields.io/badge/status-work_in_progress-yellow">

The easiest way to get started with LayerZero smart contract development. This CLI tool enables you to quickly start building on top of LayerZero omnichain interoperability protocol. To get started, use the following command:

```bash
npx create-lz-oapp@latest
# or
yarn create lz-oapp
# or
pnpm create lz-oapp
# or
bunx create-lz-oapp
```

### CLI options

The list of available options is available by using `--help` CLI flag:

```bash
npx create-lz-oapp@latest --help
```

```
Create LayerZero OApp with one command

Options:
  -V, --version                output the version number
  --ci                         Run in CI (non-interactive) mode (default: false)
  -d,--destination <path>      Project directory
  -e,--example <name>          Example project (choices: "oft", "oapp")
  --log-level <level>          Log level (choices: "error", "warn", "info", "http", "verbose", "debug", "silly", default: "info")
  -p,--package-manager <name>  Node package manager to use (choices: "npm", "pnpm", "bun")
  -h, --help                   display help for command
```
