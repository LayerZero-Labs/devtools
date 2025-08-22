# Contract Documentation Generation for LayerZero Devtools

## Quick Start

Generate documentation for all contract packages:

```bash
# Using the npm script
pnpm docgen

# Or directly after building
pnpm --filter @layerzerolabs/docgen-devtools build
lz-docgen
```

Generate documentation for a specific package:

```bash
lz-docgen oft-evm
```

## What's Included

### Package Structure:
- `packages/docgen-devtools/` - Documentation generation package
  - `src/core/` - Core functionality (detection, collection, generation, ABI extraction)
  - `src/cli.ts` - Command-line interface
  - `templates/` - Handlebars documentation templates
- `DOCGEN_SETUP.md` - Detailed setup and architecture guide

### Output:
- `docgen-out/` - Generated documentation directory
  - `[package-name]/docs/` - Contract documentation in Markdown
  - `[package-name]/abis/` - Contract ABIs in JSON format
    - `interfaces/` - Interface ABIs
    - `implementations/` - Implementation ABIs
    - `libraries/` - Library ABIs
    - `index.json` - ABI index with categorized contract list
    - `README.md` - ABI usage guide
- `contract-inventory.json` - List of all contracts found

## Features

The documentation includes:
- Function signatures with selectors
- Protobuf-style input/output parameter tables
- Event documentation with indexed parameters
- Custom error documentation
- Struct definitions
- ABI download links
- Contract categorization (Interfaces, OApp, Tokens, etc.)
- Extracted ABIs organized by contract type (interfaces, implementations, libraries)
- ABI index files for programmatic access

## Usage

1. Run `pnpm docgen` to generate docs
2. Copy `docgen-out/` to your Docusaurus docs repository
3. Configure Docusaurus sidebar to include the contract reference

For detailed instructions, see `DOCGEN_SETUP.md`.

## Contract Packages Documented

- `oapp-evm` - OApp standard contracts
- `oft-evm` - OFT token contracts
- `onft-evm` - ONFT NFT contracts  
- `ovault-evm` - Vault composer contracts
- `hyperliquid-composer` - Hyperliquid integration contracts

## Notes

- Mock and test contracts are automatically excluded
- Each package is processed independently to avoid dependency conflicts
- Documentation is generated in Markdown format compatible with Docusaurus
- Templates follow the "protobuf-style" format based on user feedback
