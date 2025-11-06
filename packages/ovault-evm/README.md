<p align="center">
  <a href="https://layerzero.network">
    <img alt="LayerZero" style="max-width: 500px" src="https://d3a2dpnnrypp5h.cloudfront.net/bridge-app/lz.png"/>
  </a>
</p>

<h1 align="center">@layerzerolabs/ovault-evm</h1>

<!-- The badges section -->
<p align="center">
  <!-- Shields.io NPM published package version -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/ovault-evm"><img alt="NPM Version" src="https://img.shields.io/npm/v/@layerzerolabs/ovault-evm"/></a>
  <!-- Shields.io NPM downloads -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/ovault-evm"><img alt="Downloads" src="https://img.shields.io/npm/dm/@layerzerolabs/ovault-evm"/></a>
  <!-- Shields.io license badge -->
  <a href="https://www.npmjs.com/package/@layerzerolabs/ovault-evm"><img alt="NPM License" src="https://img.shields.io/npm/l/@layerzerolabs/ovault-evm"/></a>
</p>

## Installation

```bash
pnpm install @layerzerolabs/ovault-evm
```

```bash
npm install @layerzerolabs/ovault-evm
```

## Ovault SDK

This is an SDK to make depositing/redeeming on OVaults simple.

Currently this only supports synchronous vault withdrawls.

### Usage

All information required can be retrieved by calling `OVaultMessageBuilder.generateOVaultInputs`. You need to pass in an object like:

```typescript
{
  srcEid: number,
  hubEid: number,
  dstEid: number,
  walletAddress: `0x${string}`,
  dstAddress?: `0x${string}`, // If no dstAddress is supplied, it's assumed to be the same as the source wallet address
  vaultAddress: `0x${string}`,
  composerAddress: `0x${string}`,
  hubChain: Chain, // This is a Viem chain definition
  sourceChain: Chain, // This is a Viem chain definition
  operation: OVaultOperations,
  amount: bigint,
  slippage: number, // such as 0.01 for 1% slippage
  oftAddress: `0x${string}`,
  tokenAddress?: `0x${string}`, // If the token address is not supplied, its assumed the OFT and the token are the same
}
```

For full information about the input object check `GenerateOVaultSyncInputsProps` in `src/types.ts`

You will then recieve an `OVaultInputs` object back containing all information you should need to create the transaction or display to users

### Example

#### Base Functionality

Below is an example of how to deposit tokens using the Viem client on a server side environment.

```typescript
const input = {
  srcEid: 40245, // eid for base-sepolia
  hubEid: 40231, // eid for arbitrum-sepolia
  dstEid: 40245, // eid for base-sepolia

  // Optional. If dstAddress is not specified it will default to the walletAddress on the dst chain
  dstAddress: "0x0000000000000000000000000000000000000000",
  walletAddress: "0x0000000000000000000000000000000000000000",
  vaultAddress: "0x0000000000000000000000000000000000000000",

  // Address of the OVault Composer on the Hub Chain. Should implement IVaultComposerSync
  composerAddress: "0x0000000000000000000000000000000000000000",

  // Supply the Viem Chain Definitions for the hub and source chain. This is so the sdk can
  // quote fees and perform read operations
  hubChain: arbitrumSepolia,
  sourceChain: baseSepolia,
  operation: OVaultOperations.DEPOSIT,
  amount: 100000000000000000n,
  slippage: 0.01, // 1% slippage

  // Address of the token/oft. The token is an ERC20. They can be the same address.
  // If tokenAddress isn't specified it defaults to the oftAddress
  tokenAddress: "0x0000000000000000000000000000000000000000",
  oftAddress: "0x0000000000000000000000000000000000000000",
} as const;

const inputs = await OVaultMessageBuilder.generateOVaultInputs(input);
const account = privateKeyToAccount("YOUR PRIVATE KEY HERE");

const walletClient = createWalletClient({
  account,
  chain: srcChain.chain,
  transport: http(),
}).extend(publicActions);

if (inputs.approval) {
  // Approve token if required
  const approvalTx = await walletClient.writeContract({
    address: inputs.approval.tokenAddress,
    abi: ERC20Abi,
    functionName: "approve",
    args: [inputs.approval.spender, inputs.approval.amount],
  });
  await walletClient.waitForTransactionReceipt({ hash: approvalTx });
}

const tx = await walletClient.writeContract({
  address: inputs.contractAddress,
  abi: inputs.abi,
  value: inputs.messageFee.nativeFee,
  functionName: inputs.contractFunctionName,
  args: inputs.txArgs as any,
});
```

For more example usage you can check `./test/sdk.test.ts`. It will run transactions against the deployed OVault contracts
on Base-Sepolia and Arbitrum-Sepolia

### Using Stargate Native Pools

If you are staking in Stargate's native pools you will need a slightly different setup. As the asset is the native token there is not really an OFT or an ERC20 address. So for the asset OFT and ERC20 address you need to supply the Native Pool and `0x0`(or some other 0 value hex string).

The Native Pool implements the OFT interface, and the `0x0` address will let the library know that it should handle it as a native pool. Other than that it is the same. If you are using wETH, you can supply arguments normally. This is just for ETH or other native tokens specifically.

#### Adding Buffer to Hub Chain Fee

You can add a buffer to the fee on the hub chain by override the `calculateHubChainFee` function.

```typescript
class OVaultSyncMessageBuilderWithBuffer extends OVaultSyncMessageBuilder {
  static override async calculateHubChainFee(
    input: SendParamsInput,
    useWalletAddress = true,
  ) {
    const fee = await super.calculateHubChainFee(input, useWalletAddress);
    return {
      nativeFee: (fee.nativeFee * 3n) / 2n, // Add 1.5x buffer to the fee
      lzTokenFee: fee.lzTokenFee,
    };
  }
}
```
