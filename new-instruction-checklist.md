# Adding a New Instruction to OApp: Complete Checklist

When adding a new instruction like `RegisterDomain` to your OApp, you need to update multiple components:

## 1. Program-Level Updates (Required)

### A. Add the Instruction File
**Location**: `programs/my_oapp/src/instructions/register_domain.rs`
```rust
use crate::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(params: RegisterDomainParams)]
pub struct RegisterDomain<'info> {
    #[account(mut)]
    /// User to submit the order
    pub user: Signer<'info>,
    // ... other accounts
}

impl<'info> RegisterDomain<'info> {
    pub fn apply(ctx: &mut Context<RegisterDomain>, params: &RegisterDomainParams) -> Result<()> {
        // Your instruction logic here
        Ok(())
    }
}

#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct RegisterDomainParams {
    // Your parameters here
}
```

### B. Update the Instructions Module
**Location**: `programs/my_oapp/src/instructions/mod.rs`
```rust
pub mod register_domain;
// ... existing modules

pub use register_domain::*;
// ... existing use statements
```

### C. Update the Main Program
**Location**: `programs/my_oapp/src/lib.rs`
```rust
#[program]
pub mod my_oapp {
    use super::*;

    // ... existing instructions

    // Add your new instruction handler
    pub fn register_domain(
        mut ctx: Context<RegisterDomain>,
        params: RegisterDomainParams,
    ) -> Result<()> {
        RegisterDomain::apply(&mut ctx, &params)
    }
}
```

## 2. Client-Side Updates (Required if using generated client)

### A. Regenerate Client Code
**Command**: After rebuilding the program, run:
```bash
# This will regenerate the client code in lib/client/generated/
anchor build
```

### B. Update Client Interface (if needed)
**Location**: `lib/client/myoapp.ts`
```typescript
// Add method to the MyOApp class if needed
registerDomain(
    accounts: {
        user: Signer
        // ... other accounts
    },
    params: {
        // ... your parameters
    }
): WrappedInstruction {
    return instructions.registerDomain(
        { programs: this.programRepo },
        {
            user: accounts.user,
            // ... other accounts
            
            // args
            // ... your parameters
        }
    ).items[0]
}
```

## 3. Task/Script Updates (Optional)

### A. Create Task File (if needed)
**Location**: `tasks/common/register_domain.ts`
```typescript
import { task, types } from 'hardhat/config'
import { ActionType, HardhatRuntimeEnvironment } from 'hardhat/types'

interface TaskArguments {
    // Your task parameters
}

const action: ActionType<TaskArguments> = async (
    { /* params */ },
    hre: HardhatRuntimeEnvironment
) => {
    // Your task logic
}

task('lz:oapp:register-domain', 'Register a domain', action)
    .addParam('param1', 'Description', undefined, types.string, false)
    // ... other parameters
```

### B. Update Task Index
**Location**: `tasks/index.ts`
```typescript
import './common/register_domain'
// ... existing imports
```

## 4. Type Updates (If using TypeScript)

### A. Update Type Definitions
**Location**: `lib/client/types.ts` (if it exists)
```typescript
export interface RegisterDomainParam {
    // Your parameter types
}
```

## 5. Testing Updates (Recommended)

### A. Add Unit Tests
**Location**: `test/register_domain.test.ts`
```typescript
describe('RegisterDomain', () => {
    it('should register domain successfully', async () => {
        // Your test logic
    })
})
```

### B. Add Integration Tests
**Location**: `test/integration/register_domain.test.ts`
```typescript
// Integration tests with actual transactions
```

## 6. Documentation Updates (Optional)

### A. Update README
**Location**: `README.md`
```markdown
## New Instruction: Register Domain

### Usage
```bash
npx hardhat lz:oapp:register-domain --param1 "value"
```

### Parameters
- `param1`: Description of parameter
```

## Key Points to Remember

### Account Constraints
- Your `user: Signer<'info>` account will automatically be treated as a signer
- If you need the user to pay for something, ensure the account is marked as `mut`
- Consider adding proper validation constraints

### Error Handling
- Define custom errors in `programs/my_oapp/src/errors.rs` if needed
- Use proper error handling in your instruction logic

### Security Considerations
- Validate all inputs
- Check account ownership if needed
- Implement proper access controls

### Build and Deploy
After making changes:
```bash
# Rebuild the program
anchor build

# Deploy (if needed)
solana program deploy --program-id target/deploy/my_oapp-keypair.json target/verifiable/my_oapp.so -u devnet

# Test your changes
pnpm test
```

## What's NOT Required
- **LayerZero Configuration**: No need to update `layerzero.config.ts` unless your instruction affects cross-chain messaging
- **Wiring**: No need to re-run wire tasks unless you're adding new cross-chain functionality
- **Endpoint Configuration**: Your instruction doesn't affect LayerZero endpoint settings

## Summary
The main requirements are:
1. ✅ Add the instruction file
2. ✅ Update program lib.rs
3. ✅ Update instructions module
4. ✅ Rebuild program (generates client code)
5. ⚠️ Optional: Add tasks, tests, and documentation

The existing LayerZero OApp functionality remains unchanged - you're just adding a new instruction that uses the standard Anchor account structure.