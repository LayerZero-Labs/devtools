# @layerzerolabs/docgen-devtools

Contract documentation generation tools for LayerZero protocol.

## Features

- Automatic detection of EVM contract packages in the monorepo
- Smart categorization of contracts, interfaces, and libraries
- Integration with Bonadocs for beautiful documentation
- Support for both individual package and bulk documentation generation

## Installation

This package is part of the LayerZero devtools monorepo. It's automatically available when working within the repository.

To ensure the CLI is available globally within the monorepo:
```bash
pnpm --filter @layerzerolabs/docgen-devtools build
```

## Usage

### From the monorepo root:

```bash
# Generate documentation for all contract packages
pnpm docgen

# Or use the CLI directly after building
pnpm --filter @layerzerolabs/docgen-devtools build
./packages/docgen-devtools/dist/cli.js

# Generate documentation for a specific package
./packages/docgen-devtools/dist/cli.js oft-evm
```

### Programmatic usage:

```typescript
import { detectContractPackages, generateAllDocs } from '@layerzerolabs/docgen-devtools'

// Detect all EVM contract packages
const packages = detectContractPackages()

// Generate documentation
await generateAllDocs(packages, {
  rootDir: process.cwd(),
  outputDir: './docgen-out',
  templatesDir: './templates'
})
```

## Package Detection

The tool automatically detects EVM contract packages by looking for:
- A `contracts/` directory with `.sol` files
- `foundry.toml` configuration
- EVM-related dependencies
- Package names containing "evm"

## Output Structure

Documentation is generated in the `docgen-out/` directory:
```
docgen-out/
├── README.md              # Overview of all documented contracts
├── contract-inventory.json # JSON inventory of all contracts
├── oft-evm/               # Package-specific documentation
│   ├── IOFT.md
│   ├── OFT.md
│   └── ...
├── oapp-evm/
│   └── ...
└── ...
```

## Templates

Documentation templates are located in `templates/` and use Handlebars syntax. The templates follow a "protobuf-style" format with:
- Function signatures with selectors
- Input/output parameter tables
- Events and errors documentation
- Contract categorization

## Development

```bash
# Build the package
pnpm build

# Watch for changes
pnpm dev

# Run linting
pnpm lint
```
