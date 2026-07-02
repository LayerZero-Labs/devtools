# Token-2022 Transfer Hook Example

This program demonstrates how to implement a **Transfer Hook** for Token-2022 tokens on Solana. Transfer Hooks allow you to execute custom validation logic on every token transfer.

## What is a Transfer Hook?

Token-2022 (SPL Token Extensions) introduced the [Transfer Hook extension](https://spl.solana.com/token-2022/extensions#transfer-hook), which allows token creators to specify a program that gets invoked on every transfer. This enables powerful use cases:

| Use Case | Description |
|----------|-------------|
| **Compliance** | Enforce allowlist/blocklist for regulated tokens (securities, stablecoins) |
| **Royalties** | Ensure royalty payments are included in NFT transfers |
| **Transfer Restrictions** | Time-locks, vesting schedules, daily limits |
| **Analytics** | Track transfer volumes, collect fees, log events |
| **Cross-chain** | Custom logic for bridged/wrapped tokens |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     User: transfer_checked()                    │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Token-2022 Program                            │
│  1. Validate balances, decimals, signatures                     │
│  2. Check for Transfer Hook extension                           │
│  3. CPI to Transfer Hook program ───────────────────────────┐   │
└─────────────────────────────────────────────────────────────│───┘
                                                              │
                               ┌──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Transfer Hook Program (this)                    │
│  1. Receive transfer context (source, dest, amount, authority)  │
│  2. Execute custom validation logic                             │
│  3. Return Ok(()) to allow, or Err to reject                    │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Transfer Complete  │
                    │    (or Reverted)    │
                    └─────────────────────┘
```

## Key Components

### 1. ExtraAccountMetaList PDA

Before transfers can work, you must initialize an `ExtraAccountMetaList` PDA. This account declares which additional accounts your hook needs beyond the standard transfer accounts.

```
Seeds: ["extra-account-metas", mint.key()]
```

### 2. The `fallback` Instruction

Token-2022 uses the SPL instruction format, not Anchor's. The `fallback` handler bridges this gap:

```rust
pub fn fallback<'info>(
    program_id: &Pubkey,
    accounts: &'info [AccountInfo<'info>],
    data: &[u8],
) -> Result<()> {
    let instruction = TransferHookInstruction::unpack(data)?;
    match instruction {
        TransferHookInstruction::Execute { amount } => {
            // Route to our transfer_hook handler
        }
        _ => Err(ProgramError::InvalidInstructionData.into()),
    }
}
```

### 3. The `transfer_hook` Instruction

This is where your custom logic lives:

```rust
pub fn transfer_hook(ctx: Context<TransferHookExecute>, amount: u64) -> Result<()> {
    // Your validation logic here
    // Return Ok(()) to allow, Err to reject
    require!(amount > 100, HookError::AmountTooSmall);
    Ok(())
}
```

## Usage

### 1. Build the Program

```bash
anchor build -p transfer-hook
```

### 2. Create a Mint with Transfer Hook Extension

```typescript
import {
  createInitializeMintInstruction,
  createInitializeTransferHookInstruction,
  getMintLen,
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

const extensions = [ExtensionType.TransferHook];
const mintLen = getMintLen(extensions);

const transaction = new Transaction().add(
  // Create the mint account
  SystemProgram.createAccount({
    fromPubkey: payer,
    newAccountPubkey: mint,
    space: mintLen,
    lamports: await connection.getMinimumBalanceForRentExemption(mintLen),
    programId: TOKEN_2022_PROGRAM_ID,
  }),
  // Initialize the Transfer Hook extension
  createInitializeTransferHookInstruction(
    mint,
    authority,
    TRANSFER_HOOK_PROGRAM_ID,  // Your hook program
    TOKEN_2022_PROGRAM_ID
  ),
  // Initialize the mint
  createInitializeMintInstruction(
    mint,
    decimals,
    mintAuthority,
    freezeAuthority,
    TOKEN_2022_PROGRAM_ID
  )
);
```

### 3. Initialize the ExtraAccountMetaList

```typescript
await program.methods
  .initializeExtraAccountMetaList()
  .accounts({
    payer: payer.publicKey,
    mint: mint,
  })
  .rpc();
```

### 4. Transfers Now Go Through Your Hook

```typescript
import { createTransferCheckedWithTransferHookInstruction } from "@solana/spl-token";

const transferIx = await createTransferCheckedWithTransferHookInstruction(
  connection,
  source,
  mint,
  destination,
  authority,
  amount,
  decimals,
  [],
  "confirmed",
  TOKEN_2022_PROGRAM_ID
);
```

## Extending This Example

### Adding Config State

For a compliance hook, you might add a config PDA:

```rust
#[account]
pub struct TokenConfig {
    pub authority: Pubkey,      // Admin who can update config
    pub paused: bool,           // Global pause switch
    pub allowlist_mode: u8,     // 0=Open, 1=Blacklist, 2=Whitelist
}
```

### Adding Allowlist PDAs

```rust
#[account]
pub struct AllowlistEntry {
    pub bump: u8,  // Marker PDA - existence determines status
}
```

### Updating ExtraAccountMetaList

When you add custom accounts, update `Initialize::apply()`:

```rust
let extra_account_metas: Vec<ExtraAccountMeta> = vec![
    // Add your TokenConfig PDA
    ExtraAccountMeta::new_with_seeds(
        &[Seed::Literal { bytes: b"config".to_vec() }],
        false,  // is_signer
        false,  // is_writable
    )?,
];
```

## Integration with OFT

This Transfer Hook can be used with LayerZero OFT tokens. When configured:

1. **Inbound transfers** (from OFT program) can be whitelisted to skip checks
2. **Outbound/P2P transfers** go through full validation
3. **Compliance** is enforced at the token level, not the OFT level

See the main [oft-solana README](../../README.md) for OFT integration details.

## Testing

The tests use Jest and require a local validator. From the workspace root:

```bash
# Run all Anchor tests (starts local validator automatically)
pnpm run test:anchor

# Or run just the transfer-hook tests directly
npx jest test/anchor/transfer-hook.test.ts
```

Note: The tests require the program to be built first (`anchor build -p transfer-hook`).

## References

- [Solana Transfer Hook Guide](https://solana.com/developers/guides/token-extensions/transfer-hook)
- [Token-2022 Documentation](https://spl.solana.com/token-2022)
- [ExtraAccountMetaList Docs](https://docs.rs/spl-tlv-account-resolution)
- [SPL Transfer Hook Interface](https://docs.rs/spl-transfer-hook-interface)

## License

Apache-2.0
