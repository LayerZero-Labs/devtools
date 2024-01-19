<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<h1 align="center">@layerzerolabs/toolbox-foundry</h1>

<p align="center">One-stop-shop for developing LayerZero applications with <code>foundry</code></p>

## Installation

```bash
yarn add @layerzerolabs/toolbox-foundry

pnpm add @layerzerolabs/toolbox-foundry

npm install @layerzerolabs/toolbox-foundry
```

## Configuration

### 1. Add `@layerzerolabs/toolbox-foundry` to your config

To use `@layerzerolabs/toolbox-foundry` you will need to point to it in your `foundry.toml` config file.

```toml
libs = [
  'node_modules/@layerzerolabs/toolbox-foundry/lib',
  # Any other library folders you need, e.g.
  'node_modules'
]
```

## Usage

### Testing

This package comes with support for `forge-std` out of the box so you can start using:

```solidity
// forge-std is automatically resolved without needing to install it
// so you can start using forge test helpers in your tests
import "forge-std/console.sol";
import { Test } from "forge-std/Test.sol";
```

The supporting packages for `@layerzerolabs/` dependencies are also included - namely `solidity-bytes-utils`.
