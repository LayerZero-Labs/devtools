# How to Get Solana OFT's Shared Decimals

## Overview

In the Solana OFT (Omnichain Fungible Token) implementation, the **shared decimals** are not directly stored in the `OFTStore` account. Instead, they can be calculated from the `ld2sd_rate` (local decimals to shared decimals rate) and the token mint decimals.

## Key Concepts

1. **Shared Decimals**: The number of decimal places preserved during cross-chain transfers
2. **Local Decimals**: The native decimal places of the token on Solana (from the token mint)
3. **ld2sd_rate**: Conversion rate from local decimals to shared decimals

## Formula

```
shared_decimals = token_mint_decimals - log10(ld2sd_rate)
```

Where:
- `token_mint_decimals` = decimals of the SPL token mint
- `ld2sd_rate` = conversion rate stored in the OFTStore account

## Implementation

### Step 1: Fetch OFTStore Data

```typescript
import { oft } from '@layerzerolabs/oft-v2-solana-sdk'
import { fetchMint } from '@metaplex-foundation/mpl-toolbox'
import { publicKey } from '@metaplex-foundation/umi'

// Fetch the OFTStore account
const oftStoreInfo = await oft.accounts.fetchOFTStore(umi, publicKey(oftStoreAddress))
```

### Step 2: Get Token Mint Decimals

```typescript
// Fetch the token mint information
const mintInfo = await fetchMint(umi, publicKey(oftStoreInfo.tokenMint))
const tokenMintDecimals = mintInfo.decimals
```

### Step 3: Calculate Shared Decimals

```typescript
// Get the conversion rate from OFTStore
const ld2sdRate = oftStoreInfo.ld2sdRate

// Calculate shared decimals
const sharedDecimals = tokenMintDecimals - Math.log10(Number(ld2sdRate))
const roundedSharedDecimals = Math.round(sharedDecimals)
```

## Complete Example

```typescript
export async function getOFTSharedDecimals(umi: any, oftStoreAddress: string): Promise<number> {
    // 1. Fetch OFTStore account data
    const oftStoreInfo = await oft.accounts.fetchOFTStore(umi, publicKey(oftStoreAddress))
    
    // 2. Fetch token mint decimals
    const mintInfo = await fetchMint(umi, publicKey(oftStoreInfo.tokenMint))
    const tokenMintDecimals = mintInfo.decimals
    
    // 3. Get conversion rate
    const ld2sdRate = oftStoreInfo.ld2sdRate
    
    // 4. Calculate shared decimals
    const sharedDecimals = tokenMintDecimals - Math.log10(Number(ld2sdRate))
    
    return Math.round(sharedDecimals)
}
```

## Usage Example

```typescript
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { web3JsRpc } from '@metaplex-foundation/umi-rpc-web3js'

async function example() {
    const umi = createUmi(web3JsRpc('https://api.mainnet-beta.solana.com'))
    const oftStoreAddress = 'your_oft_store_address_here'
    
    const sharedDecimals = await getOFTSharedDecimals(umi, oftStoreAddress)
    console.log('OFT Shared Decimals:', sharedDecimals)
}
```

## Why This Works

The `ld2sd_rate` is calculated during OFT initialization as:

```rust
// From init_oft.rs
ctx.accounts.oft_store.ld2sd_rate = 
    10u64.pow((ctx.accounts.token_mint.decimals - params.shared_decimals) as u32);
```

So if we have:
- `token_mint_decimals = 9`
- `shared_decimals = 6`
- Then `ld2sd_rate = 10^(9-6) = 10^3 = 1000`

To reverse this calculation:
- `shared_decimals = token_mint_decimals - log10(ld2sd_rate)`
- `shared_decimals = 9 - log10(1000) = 9 - 3 = 6`

## Available OFTStore Fields

When you fetch the OFTStore account, you get access to:

- `oftType`: Type of OFT (Native or Adapter)
- `ld2sdRate`: Conversion rate from local to shared decimals
- `tokenMint`: Public key of the token mint
- `tokenEscrow`: Public key of the escrow account
- `endpointProgram`: Public key of the endpoint program
- `tvlLd`: Total value locked in local decimals
- `admin`: Admin public key
- `defaultFeeBps`: Default fee in basis points
- `paused`: Whether the OFT is paused

## Related Files

- `programs/oft/src/state/oft.rs`: OFTStore structure definition
- `programs/oft/src/instructions/init_oft.rs`: OFT initialization logic
- `tasks/solana/sendSolana.ts`: Example of fetching OFTStore data
- `tasks/solana/debug.ts`: Debug utility showing OFTStore information