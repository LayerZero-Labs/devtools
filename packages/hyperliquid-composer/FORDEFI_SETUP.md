# Fordefi Integration for Hyperliquid Composer

This package now supports signing Hyperliquid L1 actions using the Fordefi API, providing enterprise-grade custody and signing infrastructure.

## Overview

The `hyperliquid-composer` package supports two signing methods:

1. **Private Key (Ethers)** - Traditional signing using a private key (default)
2. **Fordefi API** - Enterprise signing using Fordefi's custody solution (new)

## Setup

### Option 1: Using Environment Variables

Add the following variables to your `.env` file:

```bash
# Fordefi Configuration (required)
FORDEFI_ACCESS_TOKEN=your_api_access_token_here
FORDEFI_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----"
FORDEFI_VAULT_ID=your_vault_id_here
FORDEFI_CHAIN=ethereum_mainnet

# Optional: Override API URL (defaults to https://api.fordefi.com)
FORDEFI_API_URL=https://api.fordefi.com

# Optional: Customize timeouts
FORDEFI_SIGNATURE_TIMEOUT=300000  # 5 minutes in milliseconds
FORDEFI_POLLING_INTERVAL=2000     # 2 seconds in milliseconds
```

### Option 2: Programmatic Configuration

```typescript
import {
  getHyperliquidSigner,
  FordefiConfig,
} from "@layerzerolabs/hyperliquid-composer";

const fordefiConfig: FordefiConfig = {
  accessToken: "your_api_access_token",
  privateKey:
    "-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----",
  vaultId: "your_vault_id",
  chain: "ethereum_mainnet",
  // apiUrl is optional - defaults to https://api.fordefi.com
  signatureTimeout: 300000, // optional
  pollingInterval: 2000, // optional
};

const signer = await getHyperliquidSigner(undefined, fordefiConfig);
```

## Fordefi Configuration Details

### Required Parameters

- **`FORDEFI_ACCESS_TOKEN`**: Your API access token (JWT) for authentication
- **`FORDEFI_PRIVATE_KEY`**: Your API User's private key in PEM format for request signing (ECDSA over NIST P-256 curve)
- **`FORDEFI_VAULT_ID`**: The ID of the vault to use for signing
- **`FORDEFI_CHAIN`**: The EVM chain identifier (e.g., `ethereum_mainnet`, `arbitrum_one`)

### Optional Parameters

- **`FORDEFI_API_URL`**: The Fordefi API endpoint (default: `https://api.fordefi.com`)
- **`FORDEFI_SIGNATURE_TIMEOUT`**: Maximum time to wait for signature approval (default: 300000ms = 5 minutes)
- **`FORDEFI_POLLING_INTERVAL`**: How often to check for signature completion (default: 2000ms = 2 seconds)

## Chain Identifiers

Common Fordefi chain identifiers:

- `ethereum_mainnet` - Ethereum Mainnet
- `ethereum_goerli` - Ethereum Goerli Testnet
- `arbitrum_one` - Arbitrum One
- `arbitrum_goerli` - Arbitrum Goerli
- `polygon` - Polygon
- `optimism` - Optimism
- `base` - Base

Refer to [Fordefi's documentation](https://docs.fordefi.com) for the complete list.

## Prerequisites

Before using the Fordefi integration, you need to:

1. **Create an API User** - Follow [Fordefi's guide](https://docs.fordefi.com/developers/setup/create-an-api-user) to create an API User and obtain:

   - Access token (JWT)
   - Private key (ECDSA over NIST P-256 curve in PEM format)

2. **Set up an API Signer** - Follow [Fordefi's guide](https://docs.fordefi.com/developers/setup/set-up-an-api-signer) to configure the API Signer

3. **Pair the API User with API Signer** - Follow [Fordefi's guide](https://docs.fordefi.com/developers/setup/pair-an-api-user-with-an-api-signer) to complete the pairing

4. **Create a Vault** - Set up a vault with an EVM address for signing transactions

## How It Works

When Fordefi configuration is present, the package will:

1. Detect Fordefi configuration (either from environment or passed directly)
2. Create a `FordefiSigner` instance instead of using a private key
3. When signing is required:
   - Construct EIP-712 typed data for the Hyperliquid L1 action
   - Sign the API request using your API User's private key (request signing per [Fordefi's authentication guide](https://docs.fordefi.com/developers/authentication))
   - Submit a signing request to Fordefi API with bearer token and request signature
   - Poll the API until the transaction is approved and signed
   - Return the signature for submission to Hyperliquid

### Authentication

The integration implements Fordefi's two-layer authentication:

1. **Bearer Token Authentication** - All API requests include the access token in the `Authorization: Bearer <TOKEN>` header
2. **Request Signing** - Sensitive operations (like creating transactions) are signed with your API User's private key using ECDSA over NIST P-256. The signature is sent in the `x-signature` header along with a timestamp in the `x-timestamp` header.

## Fallback Behavior

The signing method priority is:

1. **Fordefi** (if configured via args or environment)
2. **Private Key** (if provided via args)
3. **Private Key from Environment** (`PRIVATE_KEY_HYPERLIQUID`)

If no signing method is configured, the package will exit with an error.

## Migration from Private Key

### Before (Private Key Only)

```typescript
import { getHyperliquidWallet } from "@layerzerolabs/hyperliquid-composer";

const wallet = await getHyperliquidWallet();
// wallet is an ethers Wallet instance
```

### After (Supports Both)

```typescript
import { getHyperliquidSigner } from "@layerzerolabs/hyperliquid-composer";

const signer = await getHyperliquidSigner();
// signer is an IHyperliquidSigner (works with both Ethers and Fordefi)
```

**Note**: The old `getHyperliquidWallet()` function is still available for backward compatibility but is deprecated.

## Example: Using Fordefi in CLI

Set up your `.env` file with Fordefi credentials:

```bash
FORDEFI_ACCESS_TOKEN=your_token
FORDEFI_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----"
FORDEFI_VAULT_ID=your_vault_id
FORDEFI_CHAIN=ethereum_mainnet
# FORDEFI_API_URL=https://api.fordefi.com  # Optional - uses this by default
```

Then run any hyperliquid-composer command as normal:

```bash
# The package will automatically detect and use Fordefi
npx hyperliquid-composer set-block --size big --network mainnet
```

You'll see:

```
Using Fordefi signer for Hyperliquid actions
```

## Example: Using Fordefi Programmatically

```typescript
import {
  getHyperliquidSigner,
  HyperliquidClient,
  FordefiConfig,
} from "@layerzerolabs/hyperliquid-composer";

async function deployToken() {
  // Configure Fordefi
  const fordefiConfig: FordefiConfig = {
    accessToken: process.env.FORDEFI_ACCESS_TOKEN!,
    privateKey: process.env.FORDEFI_PRIVATE_KEY!,
    vaultId: process.env.FORDEFI_VAULT_ID!,
    chain: "ethereum_mainnet",
    // apiUrl defaults to https://api.fordefi.com if not specified
  };

  // Get signer (will use Fordefi)
  const signer = await getHyperliquidSigner(undefined, fordefiConfig);

  // Create client
  const client = new HyperliquidClient(false, "info");

  // Submit action - signing happens via Fordefi API
  const action = {
    type: "spotDeploy",
    name: "MyToken",
    szDecimals: 8,
  };

  await client.submitHyperliquidAction("/exchange", signer, action);
}
```

## Security Considerations

- **Never commit** your `FORDEFI_ACCESS_TOKEN` to version control
- Use environment-specific `.env` files (`.env.production`, `.env.staging`)
- Ensure your Fordefi vault has appropriate access controls configured
- Monitor Fordefi transaction approvals through their dashboard

## Troubleshooting

### "No EVM address found in vault"

Ensure your Fordefi vault contains an EVM-compatible address. Check your vault configuration in the Fordefi dashboard.

### "Fordefi signature timeout"

The signature request wasn't approved within the timeout period. Either:

- Increase `FORDEFI_SIGNATURE_TIMEOUT`
- Approve the transaction faster in the Fordefi dashboard
- Check if there are issues with the Fordefi API

### "Failed to create Fordefi transaction"

Check that:

- Your `FORDEFI_ACCESS_TOKEN` is valid and not expired
- Your `FORDEFI_PRIVATE_KEY` is in the correct PEM format and matches the API User
- Your API User is properly paired with the API Signer
- Your `FORDEFI_VAULT_ID` exists and you have permissions
- The `FORDEFI_CHAIN` identifier is correct
- The Fordefi API is accessible from your network

### "Invalid signature" or authentication errors

This usually indicates an issue with request signing:

- Verify your `FORDEFI_PRIVATE_KEY` is the correct private key for your API User
- Ensure the private key is in PEM format with proper line breaks
- Confirm your API User is properly paired with an API Signer
- Check that the private key uses ECDSA over NIST P-256 curve

## API Reference

### `getHyperliquidSigner(privateKey?, fordefiConfig?)`

Returns an `IHyperliquidSigner` that can sign EIP-712 typed data.

**Parameters:**

- `privateKey` (optional): Private key for Ethers signing
- `fordefiConfig` (optional): Fordefi configuration object

**Returns:** `Promise<IHyperliquidSigner>`

### `FordefiConfig`

```typescript
interface FordefiConfig {
  accessToken: string;
  privateKey: string; // API User's private key in PEM format
  vaultId: string;
  chain: string;
  apiUrl?: string; // optional, defaults to https://api.fordefi.com
  signatureTimeout?: number; // milliseconds
  pollingInterval?: number; // milliseconds
}
```

### `IHyperliquidSigner`

```typescript
interface IHyperliquidSigner {
  getAddress(): Promise<string>;
  signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, unknown>,
  ): Promise<string>;
}
```

## Additional Resources

- [Fordefi Documentation](https://docs.fordefi.com)
- [Fordefi EVM Message Signing](https://docs.fordefi.com/developers/transaction-types/evm-message-signature)
- [Hyperliquid Documentation](https://hyperliquid.xyz/docs)

## Support

For issues related to:

- **Fordefi API**: Contact Fordefi support or check their documentation
- **Hyperliquid Composer**: Open an issue in the devtools repository
- **Hyperliquid Protocol**: Refer to Hyperliquid's documentation and support channels
