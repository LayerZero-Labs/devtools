# tests/CODEX.md

```yaml
model: codex-32k
approvalMode: manual
```

## Directory Structure

```
tests/
├── devtools-evm-hardhat-test/        ← Hardhat EVM integration tests
├── test-setup-devtools-evm-hardhat/  ← Hardhat setup tests
├── ua-devtools-evm-hardhat-test/     ← User acceptance tests
├── ua-devtools-evm-hardhat-v1-test/  ← V1 compatibility tests
├── export-deployments-test/          ← Deployment export tests
├── devtools-cli-test/               ← CLI tool tests
├── devtools-evm-test/               ← Core EVM tests
└── test-evm-node/                   ← EVM node tests
```

## Test Package Structure

Each test package follows this structure:
```
test-package/
├── contracts/                    ← Test smart contracts
├── deploy/                      ← Deployment scripts
├── test/                        ← Test suites
├── cache/                       ← Hardhat cache
├── artifacts/                   ← Compiled artifacts
├── hardhat.config.ts           ← Base configuration
├── hardhat.config.*.ts         ← Variant configurations
├── jest.config.js              ← Jest configuration
├── jest.setup.js               ← Jest setup
├── package.json                ← Package configuration
└── tsconfig.json               ← TypeScript configuration
```

## Test Environments

1. **Unit & Integration**
   * Jest-based tests in each package's `test/` directory
   * TypeScript configuration from package's `tsconfig.json`
   * Jest configuration in `jest.config.js`
   * Setup scripts in `jest.setup.js`

2. **Local Harness**
   * Hardhat nodes at `localhost:10001` & `10002`
   * Fund via `MNEMONIC` env var
   * Multiple network configurations via `hardhat.config.*.ts`
   * Test contracts in `contracts/` directory

3. **E2E (User)**
   * User acceptance tests in `ua-*` directories
   * CLI tests in `devtools-cli-test`
   * Node tests in `test-evm-node`
   * Deployment tests in `export-deployments-test`

## Commands

* **Install & Setup**
  ```bash
  pnpm install
  # Run specific test package
  pnpm test --filter devtools-evm-hardhat-test
  ```

* **CI Mode**
  ```bash
  pnpm test:ci
  ```

* **View Logs**
  ```bash
  pnpm logs --follow
  ```

* **Run Specific Tests**
  ```bash
  # Run specific test file
  pnpm test -- test/specific.test.ts
  
  # Run with specific Hardhat config
  pnpm test -- --config hardhat.config.with-valid-https-rpc.ts
  ```

## Offline Phase Requirements

* All tests rely on:
  * Hardhat's cached `list.json` in `cache/`
  * System-installed `solc` at `/usr/bin/solc`
  * Compiled artifacts in `artifacts/`
* No network requests during code-mode
* All dependencies must be pre-installed
* Test fixtures must be self-contained

## Best Practices

1. **Test Organization**
   * Group related tests in describe blocks
   * Use clear, descriptive test names
   * Follow AAA pattern (Arrange, Act, Assert)
   * Maintain separate test suites for different configurations

2. **Hardhat Configuration**
   * Use base `hardhat.config.ts` for common settings
   * Create variant configs for specific test scenarios
   * Document network configurations
   * Include proper error handling

3. **Contract Testing**
   * Keep test contracts minimal
   * Use fixtures for common contract deployments
   * Test both success and failure cases
   * Verify contract state changes

4. **Error Handling**
   * Test both success and failure cases
   * Verify error messages and types
   * Include timeout handling for async tests
   * Test network failure scenarios

