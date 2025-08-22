# LayerZero Contract Documentation Generation

This document describes the contract documentation generation system for the LayerZero devtools monorepo.

## Overview

The documentation generation system is implemented as a proper TypeScript package (`@layerzerolabs/docgen-devtools`) that:
- Automatically detects EVM contract packages in the monorepo
- Uses Bonadocs to generate beautiful, interactive documentation
- Follows the monorepo's TypeScript conventions and best practices
- Provides both CLI and programmatic interfaces

## Architecture

```
packages/docgen-devtools/
├── src/
│   ├── core/
│   │   ├── package-detector.ts    # Detects EVM contract packages
│   │   ├── contract-collector.ts  # Collects and categorizes contracts
│   │   └── doc-generator.ts       # Generates documentation
│   ├── cli.ts                     # CLI interface
│   └── index.ts                   # Main exports
├── templates/                     # Handlebars templates
│   ├── contract.hbs              # Contract documentation template
│   ├── helpers.hbs               # Template helpers
│   └── index.hbs                 # Index page template
└── package.json
```

## Installation

The documentation tools are part of the monorepo. To set them up:

```bash
# Install all dependencies
pnpm install

# Build the documentation tools
pnpm --filter @layerzerolabs/docgen-devtools build
```

## Usage

### From the Monorepo Root

```bash
# Generate documentation for all detected contract packages
pnpm docgen

# The above command runs:
# 1. Builds the docgen-devtools package
# 2. Executes the lz-docgen CLI
```

### Using the CLI Directly

```bash
# After building the package
lz-docgen              # Generate docs for all packages
lz-docgen oft-evm      # Generate docs for a specific package
```

### Programmatic Usage

```typescript
import { 
  detectContractPackages, 
  collectContracts,
  generateAllDocs 
} from '@layerzerolabs/docgen-devtools'

// Detect all EVM contract packages
const packages = detectContractPackages()

// Collect contract information
const { inventory } = collectContracts()

// Generate documentation
await generateAllDocs(packages, {
  rootDir: process.cwd(),
  outputDir: './docgen-out',
  templatesDir: path.join(__dirname, 'templates')
})
```

## Package Detection

The system automatically detects EVM contract packages by checking for:

1. **Contracts directory**: `contracts/` folder with `.sol` files
2. **Foundry configuration**: Presence of `foundry.toml`
3. **Package naming**: Names containing "evm"
4. **Dependencies**: Solidity-related dependencies like OpenZeppelin
5. **LayerZero contracts**: Dependencies on LayerZero protocol packages

The following packages are automatically excluded:
- Test helper packages (containing `test-devtools` in the name)
- Toolbox packages
- Packages with "test" or "helper" in their description

### Currently Detected Packages

The following types of packages are automatically detected:
- `oapp-evm` - OApp standard contracts
- `oft-evm` - OFT token contracts
- `onft-evm` - ONFT NFT contracts
- `ovault-evm` - Vault composer contracts
- `hyperliquid-composer` - Hyperliquid integration
- And other EVM contract packages following similar patterns

## Output Structure

Documentation is generated in the `docgen-out/` directory:

```
docgen-out/
├── README.md                 # Overview with statistics
├── contract-inventory.json   # Complete inventory of all contracts
├── oft-evm/                 # Package-specific documentation
│   ├── IOFT.md              # Interface documentation
│   ├── OFT.md               # Implementation documentation
│   └── ...
├── oapp-evm/
│   ├── IOApp.md
│   ├── OApp.md
│   └── ...
└── ...
```

## Documentation Format

The generated documentation follows a "protobuf-style" format including:

- **Function Documentation**:
  - Signature with selector
  - Input parameters table
  - Output parameters table
  - State mutability
  - NatSpec comments

- **Events**: Complete event signatures with indexed parameters
- **Errors**: Custom error definitions
- **Inheritance**: Contract inheritance hierarchy
- **ABI Links**: Downloadable ABI files

## Templates

Documentation templates use Handlebars and are located in `packages/docgen-devtools/templates/`:

- `contract.hbs` - Main contract documentation template
- `helpers.hbs` - Reusable template helpers
- `index.hbs` - Index page for navigation

### Customizing Templates

To modify the documentation format, edit the templates in the package. The templates support:
- Handlebars expressions and helpers
- Conditional rendering
- Iteration over contract elements
- Custom formatting functions

## Key Features

### Automatic Dependency Resolution
- Detects and imports Foundry remappings into Hardhat configuration
- Installs required dependencies like `solidity-bytes-utils` automatically
- Handles complex monorepo dependency chains

### ESM/CommonJS Compatibility
- Automatically detects if a package uses ESM (`"type": "module"`)
- Generates appropriate config file extension (`.js` or `.cjs`)
- Ensures compatibility across different package configurations

### Clean Logging
- Uses LayerZero's standard logging infrastructure via `@layerzerolabs/io-devtools`
- Provides clear, consistent output with proper log levels
- No random console.log statements

## Development

### Building the Package

```bash
# One-time build
pnpm --filter @layerzerolabs/docgen-devtools build

# Watch mode for development
pnpm --filter @layerzerolabs/docgen-devtools dev
```

### Adding New Contract Packages

The system automatically detects new contract packages that follow the conventions. To ensure your package is detected:

1. Place contracts in a `contracts/` directory
2. Include a `foundry.toml` configuration
3. Follow the naming convention (include "evm" for EVM packages)

### Debugging

To see which packages are being detected:

```bash
# Run the CLI with Node debugging
node packages/docgen-devtools/dist/cli.js
```

The output will show:
- Number of detected packages
- Package names and descriptions
- Processing status for each package

## Integration with Docusaurus

After generating documentation:

1. Review the output in `docgen-out/`
2. Copy the contents to your Docusaurus `docs/reference/contracts/` directory
3. Update the Docusaurus sidebar configuration to include the new sections

## Troubleshooting

### No Packages Detected

- Ensure you're running from the monorepo root
- Check that contract packages have a `contracts/` directory
- Verify packages have `.sol` files (excluding mocks/tests)

### Build Errors

- Run `pnpm install` to ensure all dependencies are installed
- Check that TypeScript version matches the monorepo requirements
- Ensure `@bonadocs/docgen` is compatible with your Hardhat version

### Template Errors

- Check Handlebars syntax in template files
- Ensure all referenced helpers are defined
- Verify template paths are correct

## Best Practices

1. **Keep Templates Simple**: Focus on clarity and usability
2. **Exclude Test Files**: The system automatically excludes Mock*, Test*, and Harness* files
3. **Test Package Exclusion**: Test helper packages (like test-devtools-*) are automatically excluded
4. **Regular Updates**: Regenerate docs when contracts change
5. **Version Control**: Consider versioning generated documentation
6. **Clean Dependencies**: Temporary dependencies are installed per package and cleaned up automatically

## Future Enhancements

Potential improvements to consider:
- GitHub Action for automatic PR creation
- Incremental documentation updates
- Cross-reference linking between contracts
- Search functionality integration
- Version comparison tools
