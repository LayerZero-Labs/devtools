# Fireblocks Integration for Hyperliquid Composer

This package now supports signing Hyperliquid L1 actions using the Fireblocks API, providing enterprise-grade custody and signing infrastructure.

## Overview

The `hyperliquid-composer` package supports three signing methods:

1. **Private Key (Ethers)** - Traditional signing using a private key (default)
2. **Fordefi API** - Enterprise signing using Fordefi's custody solution
3. **Fireblocks API** - Enterprise signing using Fireblocks' custody solution (new)

## Setup

### Option 1: Using Environment Variables

Add the following variables to your `.env` file:

```bash
# Fireblocks Configuration (required)
FIREBLOCKS_API_KEY=your_api_key_here
FIREBLOCKS_SECRET_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
FIREBLOCKS_VAULT_ACCOUNT_ID=0

# Optional: Override API URL (defaults to https://api.fireblocks.io)
FIREBLOCKS_API_URL=https://api.fireblocks.io

# Optional: Customize timeouts
FIREBLOCKS_SIGNATURE_TIMEOUT=300000  # 5 minutes in milliseconds
FIREBLOCKS_POLLING_INTERVAL=2000     # 2 seconds in milliseconds
```

### Option 2: Programmatic Configuration

```typescript
import {
  getHyperliquidSigner,
  FireblocksConfig,
} from "@layerzerolabs/hyperliquid-composer";

const fireblocksConfig: FireblocksConfig = {
  apiKey: "your_api_key",
  secretKey:
    "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----",
  vaultAccountId: "0",
  // apiUrl is optional - defaults to https://api.fireblocks.io
  signatureTimeout: 300000, // optional
  pollingInterval: 2000, // optional
};

const signer = await getHyperliquidSigner(
  undefined,
  undefined,
  fireblocksConfig,
);
```

## Fireblocks Configuration Details

### Required Parameters

- **`FIREBLOCKS_API_KEY`**: Your API Key (UUID format)
- **`FIREBLOCKS_SECRET_KEY`**: Your RSA private key in PEM format for JWT signing
- **`FIREBLOCKS_VAULT_ACCOUNT_ID`**: The ID of the vault account to use for signing (e.g., "0")

### Optional Parameters

- **`FIREBLOCKS_API_URL`**: The Fireblocks API endpoint (default: `https://api.fireblocks.io`)
- **`FIREBLOCKS_SIGNATURE_TIMEOUT`**: Maximum time to wait for signature approval (default: 300000ms = 5 minutes)
- **`FIREBLOCKS_POLLING_INTERVAL`**: How often to check for signature completion (default: 2000ms = 2 seconds)

## Prerequisites

Before using the Fireblocks integration, you need to:

1. **Create an API User** - Follow [Fireblocks' guide](https://developers.fireblocks.com/docs/api-authentication) to create an API User and obtain:

   - API Key (UUID)
   - RSA Private Key (PEM format)

2. **Set up a Vault Account** - Create a vault account with an ETH address for signing transactions

3. **Configure Permissions** - Ensure your API User has permissions to:
   - Create typed message transactions
   - Access the vault account you plan to use

## How It Works

When Fireblocks configuration is present, the package will:

1. Detect Fireblocks configuration (either from environment or passed directly)
2. Create a `FireblocksSigner` instance instead of using a private key
3. When signing is required:
   - Construct EIP-712 typed data for the Hyperliquid L1 action
   - Generate a JWT token for API authentication
   - Submit a typed message signing request to Fireblocks API
   - Poll the API until the transaction is approved and signed
   - Return the signature for submission to Hyperliquid

### Authentication

The integration implements Fireblocks' JWT-based authentication:

1. **JWT Token Generation** - Each API request generates a short-lived JWT token (30 seconds) that includes:
   - URI path
   - Unique nonce
   - Timestamp
   - API Key (as subject)
   - SHA-256 hash of request body (for POST requests)

2. **Request Headers**:
   - `X-API-Key`: Your API Key
   - `Authorization: Bearer <JWT>`

The JWT is signed with your RSA private key using RS256 algorithm.

## EIP-712 Typed Message Signing

Fireblocks supports EIP-712 typed message signing for Ethereum and EVM networks. The integration:

1. Creates a `TYPED_MESSAGE` transaction with operation type
2. Sets `assetId` to `ETH` (required for all EVM networks)
3. Includes the full EIP-712 structure (types, domain, message, primaryType)
4. Polls for transaction completion
5. Extracts the signature components (r, s, v) and reconstructs the full signature

**Note**: Even when signing for non-Ethereum EVM networks, you must specify `assetId: "ETH"` because all EVM networks use the same address derivation.

## Fallback Behavior

The signing method priority is:

1. **Fordefi** (if configured via args or environment)
2. **Fireblocks** (if configured via args or environment)
3. **Private Key** (if provided via args)
4. **Private Key from Environment** (`PRIVATE_KEY_HYPERLIQUID`)

If no signing method is configured, the package will exit with an error.

## Migration from Private Key

### Before (Private Key Only)

```typescript
import { getHyperliquidWallet } from "@layerzerolabs/hyperliquid-composer";

const wallet = await getHyperliquidWallet();
// wallet is an ethers Wallet instance
```

### After (Supports Multiple Methods)

```typescript
import { getHyperliquidSigner } from "@layerzerolabs/hyperliquid-composer";

const signer = await getHyperliquidSigner();
// signer is an IHyperliquidSigner (works with Ethers, Fordefi, and Fireblocks)
```

**Note**: The old `getHyperliquidWallet()` function is still available for backward compatibility but is deprecated.

## Example: Using Fireblocks in CLI

Set up your `.env` file with Fireblocks credentials:

```bash
FIREBLOCKS_API_KEY=your_api_key_uuid
FIREBLOCKS_SECRET_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
FIREBLOCKS_VAULT_ACCOUNT_ID=0
# FIREBLOCKS_API_URL=https://api.fireblocks.io  # Optional - uses this by default
```

Then run any hyperliquid-composer command as normal:

```bash
# The package will automatically detect and use Fireblocks
npx hyperliquid-composer set-block --size big --network mainnet
```

You'll see:

```
Using Fireblocks signer for Hyperliquid actions
```

## Example: Using Fireblocks Programmatically

```typescript
import {
  getHyperliquidSigner,
  HyperliquidClient,
  FireblocksConfig,
} from "@layerzerolabs/hyperliquid-composer";
import { readFileSync } from "fs";

async function deployToken() {
  // Load secret key from file
  const secretKey = readFileSync("./fireblocks_secret.key", "utf-8");

  // Configure Fireblocks
  const fireblocksConfig: FireblocksConfig = {
    apiKey: process.env.FIREBLOCKS_API_KEY!,
    secretKey,
    vaultAccountId: "0",
    // apiUrl defaults to https://api.fireblocks.io if not specified
  };

  // Get signer (will use Fireblocks)
  const signer = await getHyperliquidSigner(
    undefined,
    undefined,
    fireblocksConfig,
  );

  // Create client
  const client = new HyperliquidClient(false, "info");

  // Submit action - signing happens via Fireblocks API
  const action = {
    type: "spotDeploy",
    name: "MyToken",
    szDecimals: 8,
  };

  await client.submitHyperliquidAction("/exchange", signer, action);
}
```

## Example: Using Fireblocks TypeScript SDK (Reference)

The Fireblocks documentation provides a complete example of EIP-712 signing:

```typescript
import {
  Fireblocks,
  TransactionOperation,
  TransferPeerPathType,
} from "@fireblocks/ts-sdk";

const fireblocks = new Fireblocks({
  apiKey: FIREBLOCKS_API_KEY,
  secretKey: FIREBLOCKS_SECRET_KEY,
});

const chainId = 1; // Ethereum mainnet

const eip712message = {
  types: {
    EIP712Domain: [
      { name: "name", type: "string" },
      { name: "version", type: "string" },
      { name: "chainId", type: "uint256" },
      { name: "verifyingContract", type: "address" },
    ],
    Permit: [
      { name: "holder", type: "address" },
      { name: "spender", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "expiry", type: "uint256" },
      { name: "allowed", type: "bool" },
    ],
  },
  primaryType: "Permit",
  domain: {
    name: "Dai Stablecoin",
    version: "1",
    chainId,
    verifyingContract: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  },
  message: {
    holder: "0x289826f7248b698B2Aef6596681ab0291BFB2599",
    spender: "0x043f38E9e8359ca32cD57503df25B8DEF2845356",
    nonce: 123,
    expiry: 1655467980,
    allowed: true,
  },
};

const transactionResponse = await fireblocks.transactions.createTransaction({
  transactionRequest: {
    operation: TransactionOperation.TypedMessage,
    assetId: "ETH",
    source: {
      type: TransferPeerPathType.VaultAccount,
      id: "0",
    },
    note: "Test EIP-712 Message",
    extraParameters: {
      rawMessageData: {
        messages: [
          {
            content: eip712message,
            type: "EIP712",
          },
        ],
      },
    },
  },
});
```

Our implementation follows this pattern internally.

## Security Considerations

- **Never commit** your `FIREBLOCKS_SECRET_KEY` or `FIREBLOCKS_API_KEY` to version control
- Store the secret key file (`fireblocks_secret.key`) securely
- Use environment-specific `.env` files (`.env.production`, `.env.staging`)
- Ensure your Fireblocks vault has appropriate access controls configured
- Monitor Fireblocks transaction approvals through their console

## Troubleshooting

### "No ETH address found in vault account"

Ensure your Fireblocks vault account contains an ETH asset with an address. Check your vault configuration in the Fireblocks console.

### "Fireblocks signature timeout"

The signature request wasn't approved within the timeout period. Either:

- Increase `FIREBLOCKS_SIGNATURE_TIMEOUT`
- Approve the transaction faster in the Fireblocks console
- Check if there are issues with the Fireblocks API
- Verify your transaction approval policy is configured correctly

### "Failed to create Fireblocks transaction"

Check that:

- Your `FIREBLOCKS_API_KEY` is valid and in UUID format
- Your `FIREBLOCKS_SECRET_KEY` is in the correct RSA PEM format
- Your API User has permissions to create typed message transactions
- Your `FIREBLOCKS_VAULT_ACCOUNT_ID` exists and you have access
- The Fireblocks API is accessible from your network

### Authentication or JWT errors

This usually indicates an issue with JWT generation:

- Verify your `FIREBLOCKS_SECRET_KEY` is the correct RSA private key
- Ensure the private key is in PEM format with proper line breaks
- Confirm your API User has the necessary permissions
- Check that the secret key uses RSA algorithm (not ECDSA)

### "Transaction was rejected/blocked/cancelled"

- Review your Fireblocks transaction approval policy
- Check the Fireblocks console for rejection reasons
- Verify the transaction meets your policy requirements
- Ensure approvers are available to approve transactions

## Signature Structure

When a transaction is completed, Fireblocks returns the signature in the `signedMessages` array:

```json
{
  "signedMessages": [
    {
      "signature": {
        "r": "2e31d257c1bcd232c50d628e9e97407373c4a1c5cc79672039a1f7946984a702",
        "s": "370b8e16123e30968ba7018a6726f97dfc82f5547f99fe78b432a40a1d1f8564",
        "v": 0,
        "fullSig": "2e31d257..."
      }
    }
  ]
}
```

The integration reconstructs the full signature as: `0x${r}${s}${v_hex}`

## API Reference

### `getHyperliquidSigner(privateKey?, fordefiConfig?, fireblocksConfig?)`

Returns an `IHyperliquidSigner` that can sign EIP-712 typed data.

**Parameters:**

- `privateKey` (optional): Private key for Ethers signing
- `fordefiConfig` (optional): Fordefi configuration object
- `fireblocksConfig` (optional): Fireblocks configuration object

**Returns:** `Promise<IHyperliquidSigner>`

### `FireblocksConfig`

```typescript
interface FireblocksConfig {
  apiKey: string;
  secretKey: string; // RSA private key in PEM format
  vaultAccountId: string;
  apiUrl?: string; // optional, defaults to https://api.fireblocks.io
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

- [Fireblocks Documentation](https://developers.fireblocks.com/)
- [Fireblocks EIP-712 Signing](https://developers.fireblocks.com/reference/sign-typed-messages-for-ethereum-and-evm-networks#eip-712-signing-structured-data)
- [Fireblocks API Authentication](https://developers.fireblocks.com/docs/api-authentication)
- [Hyperliquid Documentation](https://hyperliquid.xyz/docs)

## Support

For issues related to:

- **Fireblocks API**: Contact Fireblocks support or check their documentation
- **Hyperliquid Composer**: Open an issue in the devtools repository
- **Hyperliquid Protocol**: Refer to Hyperliquid's documentation and support channels
