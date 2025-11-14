# Custom Workers Configuration Guide

This guide shows exactly what you need to modify in `layerzero.config.ts` to use custom DVNs and Executors.

## Overview

Thanks to recent updates to the `metadata-tools` package, custom executors and DVNs now work seamlessly with the standard `lz:oapp:wire` command. The system automatically resolves your custom worker names to their addresses when wiring your OApp.

## Prerequisites

Before configuring custom workers, you must:

1. Deploy your custom Executor contracts on each chain
2. Deploy your custom DVN contracts on each chain
3. Have the deployed contract addresses ready

## Configuration Steps

### Step 1: Identify Your Contracts

In `layerzero.config.ts`, locate your contract definitions (around lines 11-19):

```typescript
const arbitrumContract: OmniPointHardhat = {
  eid: EndpointId.OPTIMISM_V2_MAINNET, // This is your endpoint ID
  contractName: "MyOFT",
};

const baseContract: OmniPointHardhat = {
  eid: EndpointId.ARBITRUM_V2_MAINNET, // This is your endpoint ID
  contractName: "MyOFT",
};
```

### Step 2: Add Your Custom Executor Addresses

Find the `customExecutorsByEid` object (around lines 75-79) and replace the placeholder addresses:

```typescript
const customExecutorsByEid: Record<number, { address: string }> = {
  [EndpointId.OPTIMISM_V2_MAINNET]: {
    address: "0xBA91a98827706c94f0b26F195E865DB08bA2D63d",
  }, // ← YOUR OPTIMISM EXECUTOR
  [EndpointId.ARBITRUM_V2_MAINNET]: {
    address: "0xDd320b7755cAcf40c3A2045310Bf96e2e7151c34",
  }, // ← YOUR ARBITRUM EXECUTOR
  // Add more executors for other endpoints as needed
};
```

**What to change:**

- Replace `0xBA91a98827706c94f0b26F195E865DB08bA2D63d` with your deployed Executor address on Optimism
- Replace `0xDd320b7755cAcf40c3A2045310Bf96e2e7151c34` with your deployed Executor address on Arbitrum

### Step 3: Add Your Custom DVN Addresses

Find the `customDVNsByEid` object (around lines 81-85) and replace the placeholder addresses:

```typescript
const customDVNsByEid: Record<number, { address: string }> = {
  [EndpointId.ARBSEP_V2_TESTNET]: {
    address: "0xA91A576133F140BdE0AF6a9651778b697352a239",
  }, // ← YOUR ARBITRUM DVN
  [EndpointId.BASESEP_V2_TESTNET]: {
    address: "0xf6d5B5a53b94B4828d23675fbd21C2e299d110F3",
  }, // ← YOUR BASE DVN
  // Add more DVNs for other endpoints as needed
};
```

**What to change:**

- Replace `0xA91A576133F140BdE0AF6a9651778b697352a239` with your deployed DVN address on Optimism
- Replace `0xf6d5B5a53b94B4828d23675fbd21C2e299d110F3` with your deployed DVN address on Arbitrum

### Step 4: Configure Your Pathways

Find the `pathways` configuration (around lines 145-154) and set your custom DVN and Executor names:

```typescript
const pathways: TwoWayConfig[] = [
  [
    arbitrumContract,
    baseContract,
    [["MyCustomDVN"], []], // ← YOUR CUSTOM DVN NAME (must match canonicalName)
    [1, 1],
    [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS],
    "MyCustomExecutor", // ← YOUR CUSTOM EXECUTOR NAME (must match canonicalName)
  ],
];
```

**What to change:**

- Replace `'MyCustomDVN'` with your DVN's canonical name (or use multiple: `['MyCustomDVN', 'LayerZero Labs']`)
- Replace `'MyCustomExecutor'` with your executor's canonical name

### Step 5: (Optional) Customize Canonical Names

The canonical names in the metadata building section (around lines 110-113 and 127-130) determine how you reference your workers in pathways:

```typescript
// For executors
canonicalName: 'MyCustomExecutor',  // ← Change this to your preferred name (e.g., 'SimpleExecutorMock')

// For DVNs
canonicalName: 'MyCustomDVN',        // ← Change this to your preferred name (e.g., 'SimpleDVNMock')
```

**Note**: For Simple Workers, you should use the canonical names 'SimpleDVNMock' and 'SimpleExecutorMock' to match the contract names.

## Complete Example

Here's what a fully configured custom workers setup looks like:

```typescript
// 1. Your contracts (no changes needed here)
const arbitrumContract: OmniPointHardhat = {
  eid: EndpointId.ARBSEP_V2_TESTNET,
  contractName: "MyOFT",
};

const baseContract: OmniPointHardhat = {
  eid: EndpointId.BASESEP_V2_TESTNET,
  contractName: "MyOFT",
};

// 2. Your custom executor addresses
const customExecutorsByEid: Record<number, { address: string }> = {
  [EndpointId.ARBSEP_V2_TESTNET]: {
    address: "0x1234567890123456789012345678901234567890",
  },
  [EndpointId.BASESEP_V2_TESTNET]: {
    address: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
  },
};

// 3. Your custom DVN addresses
const customDVNsByEid: Record<number, { address: string }> = {
  [EndpointId.ARBSEP_V2_TESTNET]: {
    address: "0x9876543210987654321098765432109876543210",
  },
  [EndpointId.BASESEP_V2_TESTNET]: {
    address: "0xfedcbafedcbafedcbafedcbafedcbafedcbafed",
  },
};

// 4. Your pathway configuration
const pathways: TwoWayConfig[] = [
  [
    arbitrumContract,
    baseContract,
    [["MyCustomDVN"], []], // Using your custom DVN
    [1, 1],
    [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS],
    "MyCustomExecutor", // Using your custom executor
  ],
];
```

## Deployment and Usage

After configuring:

1. **Deploy your OApp** (if not already done):

   ```bash
   pnpm hardhat lz:deploy --tags MyOFT
   ```

2. **Wire your OApp with the configuration**:

   ```bash
   pnpm hardhat lz:oapp:wire --oapp-config layerzero.config.ts
   ```

3. **Send messages** (the system will automatically use your custom workers):

   ```bash
   pnpm hardhat lz:oft:send --src-eid 40231 --dst-eid 40245 --amount 1 --to <ADDRESS> --simple-workers
   ```

   > :information_source: For Simple Workers, add the `--simple-workers` flag to enable manual verification flow

## How It Works

1. **ChainKey Discovery**: The configuration automatically discovers which chainKey (e.g., 'optimism', 'arbitrum') corresponds to your endpoint IDs
2. **Metadata Extension**: Your custom executors/DVNs are added to the LayerZero metadata for the discovered chains
3. **Name Resolution**: When you use 'MyCustomExecutor' in pathways, it automatically resolves to the correct address for each chain
4. **Bidirectional Configuration**: The pathway configuration applies to both directions (Optimism→Arbitrum and Arbitrum→Optimism)

## Troubleshooting

### "No chainKey found for eid X"

- Check the console output when running the wire command - it shows discovered chainKeys
- Make sure your endpoint IDs match the LayerZero endpoint IDs for your networks
- Common mainnet chainKeys: 'ethereum', 'optimism', 'arbitrum', 'polygon', 'base'

### "Can't find executor/DVN"

- Verify your addresses are correct
- Check that the canonical names match between the metadata configuration and pathway usage
- Ensure your contracts are deployed on the target chains

### Viewing ChainKey Mappings

When you run the wire command, the configuration logs discovered chainKeys:

```
info:    ChainKey mappings for configured endpoints:
info:      MyOFT (eid: 40231): arbitrum
info:      MyOFT (eid: 40245): base
```

## Example: Using Simple Workers for Testnets

If you're using SimpleDVNMock and SimpleExecutorMock for testing on testnets without default workers:

1. **Deploy the Simple Workers**:

   ```bash
   pnpm hardhat lz:deploy --tags SimpleDVNMock
   pnpm hardhat lz:deploy --tags SimpleExecutorMock
   ```

2. **Get the deployed addresses from**:

   - `./deployments/<network-name>/SimpleDVNMock.json`
   - `./deployments/<network-name>/SimpleExecutorMock.json`

3. **Update the configuration**:

   ```typescript
   const customExecutorsByEid: Record<number, { address: string }> = {
     [EndpointId.ARBSEP_V2_TESTNET]: { address: "0x..." }, // From deployments/arbitrum-sepolia/SimpleExecutorMock.json
     [EndpointId.BASESEP_V2_TESTNET]: { address: "0x..." }, // From deployments/base-sepolia/SimpleExecutorMock.json
   };

   const customDVNsByEid: Record<number, { address: string }> = {
     [EndpointId.ARBSEP_V2_TESTNET]: { address: "0x..." }, // From deployments/arbitrum-sepolia/SimpleDVNMock.json
     [EndpointId.BASESEP_V2_TESTNET]: { address: "0x..." }, // From deployments/base-sepolia/SimpleDVNMock.json
   };
   ```

4. **Use canonical names 'SimpleDVNMock' and 'SimpleExecutorMock' in pathways**:

   ```typescript
   const pathways: TwoWayConfig[] = [
     [
       sourceContract,
       destContract,
       [["SimpleDVNMock"], []],
       [1, 1],
       [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS],
       "SimpleExecutorMock",
     ],
   ];
   ```

5. **Wire normally and use the `--simple-workers` flag when sending**:

   ```bash
   # Wire the configuration
   pnpm hardhat lz:oapp:wire --oapp-config layerzero.config.ts

   # Send with simple workers flag for manual verification
   pnpm hardhat lz:oft:send --src-eid 40232 --dst-eid 40231 --amount 1 --to <ADDRESS> --simple-workers
   ```

## Important Notes

- **One configuration file**: All custom workers are configured in `layerzero.config.ts`
- **Per-chain addresses**: Each chain needs its own executor/DVN deployment
- **Name consistency**: The canonical names must match between metadata and pathway configuration
- **Automatic resolution**: The same name (e.g., 'MyCustomExecutor') can resolve to different addresses on different chains
- **Simple Workers**: These are for testing only and should never be used in production
