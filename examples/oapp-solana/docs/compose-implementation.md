# Compose Implementation Notes

**THIS DOCUMENT IS CURRENTLY A WORK IN PROGRESS AND IS INCOMPLETE.**

This document guides you on how to support `lz_compose`.

The document is structured into sections based on modifications you need to make.

## Solana program

### Create `programs/my_oapp/src/instructions/lz_compose.rs`

```rust
use crate::*;
use anchor_lang::prelude::*;
use oapp::{
    endpoint::{instructions::ClearComposeParams, ID as ENDPOINT_ID},
    LzComposeParams,
};

#[derive(Accounts)]
pub struct LzCompose<'info> {
    #[account(mut, seeds = [STORE_SEED], bump = store.bump)]
    pub store: Account<'info, Store>,
}

impl LzCompose<'_> {
    pub fn apply(ctx: &mut Context<LzCompose>, params: &LzComposeParams) -> Result<()> {
        ctx.accounts.store.composed_count += 1;

        let seeds: &[&[u8]] =
            &[STORE_SEED, &[ctx.accounts.store.bump]];
        let params = ClearComposeParams {
            from: params.from,
            guid: params.guid,
            index: params.index,
            message: params.message.clone(),
        };
        oapp::endpoint_cpi::clear_compose(
            ENDPOINT_ID,
            ctx.accounts.store.key(),
            &ctx.remaining_accounts,
            seeds,
            params,
        )
    }
}
```

### Create a `programs/my_oapp/src/instructions/lz_compose_types.rs`

```rust
/dev/null
```

### Modify `programs/my_oapp/src/instructions/init_store.rs`

Add the LZ Compose Types account:

```rust
    pub lz_receive_types_accounts: Account<'info, LzReceiveTypesAccounts>,
+   #[account(
+        init,
+        payer = payer,
+        space = LzComposeTypesAccounts::SIZE,
+        seeds = [LZ_COMPOSE_TYPES_SEED, &store.key().to_bytes()],
+        bump
+    )]
+   pub lz_compose_types_accounts: Account<'info, LzComposeTypesAccounts>,
    pub system_program: Program<'info, System>,
// ...
impl InitStore<'_> {
    pub fn apply(ctx: &mut Context<InitStore>, params: &InitStoreParams) -> Result<()> {
        ctx.accounts.store.admin = params.admin;
        ctx.accounts.store.bump = ctx.bumps.store;
        ctx.accounts.store.endpoint_program = params.endpoint;
        ctx.accounts.store.string = "Nothing received yet.".to_string();

        ctx.accounts.lz_receive_types_accounts.store = ctx.accounts.store.key();
+       ctx.accounts.lz_compose_types_accounts.store = ctx.accounts.store.key();
```

### `programs/my_oapp/src/instructions/lz_receive.rs`

Handle compose_msg in `lz_receive`:

```rust
    let string_value = msg_codec::decode(&params.message);
    let count = &mut ctx.accounts.store;
    count.string = string_value;

+   // TODO: handle compose_msg

    Ok(())
```

<!-- TODO: complete above -->

### Modify `programs/my_oapp/src/instructions/mod.rs`

```rust
    pub mod send;
    pub mod init_store;
+   pub mod lz_compose;
+   pub mod lz_compose_types;
    pub mod lz_receive;
    pub mod lz_receive_types;
    pub mod quote_send;
    pub mod set_peer_config;


    pub use send::*;
    pub use init_store::*;
+   pub use lz_compose::*;
+   pub use lz_compose_types::*;
    pub use lz_receive::*;
    pub use lz_receive_types::*;
    pub use quote_send::*;
    pub use set_peer_config::*;
    pub use set_peer_config::*;
```

### Modify `programs/my_oapp/src/instructions/quote_send.rs` to take in `compose_msg`

```rust
// ...
impl<'info> QuoteSend<'info> {
    pub fn apply(ctx: &Context<QuoteSend>, params: &QuoteSendParams) -> Result<MessagingFee> {
-        let message = msg_codec::encode(&params.message);
+        let message = msg_codec::encode(&params.message, params.compose_msg.as_deref());
// ...
-                .combine_options(&params.options)?,
+                .combine_options(&params.compose_msg, &params.options)?,
// ...
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct QuoteSendParams {
    pub dst_eid: u32,
    pub receiver: [u8; 32],
    pub message: String,
    pub options: Vec<u8>,
+   pub compose_msg: Option<Vec<u8>>,
    pub pay_in_lz_token: bool,
}
```

### Modify `programs/my_oapp/src/instructions/send.rs` to take in `compose_msg`

```rust
impl<'info> Send<'info> {
    pub fn apply(ctx: &mut Context<Send>, params: &SendMessageParams) -> Result<()> {
-        let message = msg_codec::encode(&params.message);
+        let message = msg_codec::encode(&params.message, params.compose_msg.as_deref());
// ...
-               .combine_options(&params.options)?,
+               .combine_options(&params.compose_msg, &params.options)?,
// ...
#[derive(Clone, AnchorSerialize, AnchorDeserialize)]
pub struct SendMessageParams {
    pub dst_eid: u32,
    pub message: String,
    pub options: Vec<u8>,
+   pub compose_msg: Option<Vec<u8>>,
    pub native_fee: u64,
    pub lz_token_fee: u64,
}
// ...
```

### Modify `programs/my_oapp/lib.rs`

```rust
- use oapp::{endpoint::MessagingFee, endpoint_cpi::LzAccount, LzReceiveParams};
+ use oapp::{endpoint::MessagingFee, endpoint_cpi::LzAccount, LzComposeParams, LzReceiveParams};
// ...
  const LZ_RECEIVE_TYPES_SEED: &[u8] = b"LzReceiveTypes";
+ const LZ_COMPOSE_TYPES_SEED: &[u8] = b"LzComposeTypes";
// ...

  #[program]
  pub mod my_oapp {
      use super::*;
// ...
+  pub fn lz_compose(mut ctx: Context<LzCompose>, params: LzComposeParams) -> Result<()> {
+      LzCompose::apply(&mut ctx, &params)
+  }
+
+  pub fn lz_compose_types(
+      ctx: Context<LzComposeTypes>,
+      params: LzComposeParams,
+  ) -> Result<Vec<LzAccount>> {
+      LzComposeTypes::apply(&ctx, &params)
+  }
// ...
```

### Update the `programs/my_oapp/src/msg_codec.rs`

```rust
  pub const VANILLA_TYPE: u8 = 1;
+ pub const COMPOSED_TYPE: u8 = 2;
// ...
 fn decode_string_len(buf: &[u8]) -> usize {
      let mut string_len_bytes = [0u8;32];
      string_len_bytes.copy_from_slice(&buf[LENGTH_OFFSET..LENGTH_OFFSET+32]);
      u32::from_be_bytes(string_len_bytes[28..32].try_into().unwrap()) as usize
  }

+ pub fn msg_type(message: &[u8]) -> u8 {
+    let string_len = decode_string_len(message);
+    if message.len() > STRING_OFFSET + string_len {
+        COMPOSED_TYPE
+    } else {
+        VANILLA_TYPE
+    }
+ }

- pub fn encode(string: &str) -> Vec<u8> {
+ pub fn encode(string: &str, compose_msg: Option<&[u8]>) -> Vec<u8> {
// ...\
    let mut msg = Vec::with_capacity(
        32 +                          // length word
        string_bytes.len() +          // string
+        compose_msg.map(|m| m.len())  // optional tail
+            .unwrap_or(0)
    );
// ...
    // string
    msg.extend_from_slice(string_bytes);

+    // optional tail
+    if let Some(tail) = compose_msg {
+        msg.extend_from_slice(tail);
+    }

    msg
  }
// ...
pub fn decode(message: &[u8]) -> String {
    let string_len = decode_string_len(message);
    String::from_utf8_lossy(&message[STRING_OFFSET..STRING_OFFSET+string_len]).to_string()
}

+ pub fn compose_msg(message: &[u8]) -> Option<Vec<u8>> {
+    let string_len = decode_string_len(message);
+    if message.len() > STRING_OFFSET + string_len {
+        Some(message[STRING_OFFSET+string_len..].to_vec())
+    } else {
+        None
+ }
```

### Update `programs/my_oapp/src/state/store.rs`

```rust
// ...
#[account]
pub struct Store {
    pub admin: Pubkey,
+   pub composed_count: u64,
    pub bump: u8,
    pub endpoint_program: Pubkey,
    pub string: String,
}
// ...
/// LzComposeTypesAccounts includes accounts that are used in the LzComposeTypes
/// instruction.
+ #[account]
+ pub struct LzComposeTypesAccounts {
+     pub store: Pubkey,
+ }

+ impl LzComposeTypesAccounts {
+     pub const SIZE: usize = 8 + std::mem::size_of::<Self>();
+ }
// ...
```

## Solana Program Client

### Modify `lib/client/myoapp.ts`

```typescript
initStore(payer: Signer, admin: PublicKey): WrappedInstruction {
    const [oapp] = this.pda.oapp()
    const remainingAccounts = this.endpointSDK.getRegisterOappIxAccountMetaForCPI(payer.publicKey, oapp)
    return instructions
        .initStore(
            { payer: payer, programs: this.programRepo },
            {
                payer,
                store: oapp,
                lzReceiveTypesAccounts: this.pda.lzReceiveTypesAccounts()[0],
+               lzComposeTypesAccounts: this.pda.lzComposeTypesAccounts()[0],
                // args
                admin: admin,
                endpoint: this.endpointSDK.programId,
            }
        )
        .addRemainingAccounts(remainingAccounts).items[0]
    }
// ...
```

### Solana Tasks Scripts

`tasks/common/send.ts`:

```typescript
+    const composeMsg = '0x'
-    const [nativeFee] = await myOApp.quote(dstEid, message, options, false)
+    const [nativeFee] = await myOApp.quote(dstEid, message, composeMsg, options, false)
// ...
-    const txResponse = await myOApp.send(dstEid, message, options, {
+    const txResponse = await myOApp.send(dstEid, message, composeMsg, options, {
```

## Solidity contract

### `MyOApp.sol`

Modify `send` and `quote` to accept a `_composeMsg` argument
and appended it to the payload:

```solidity
  function send(
     uint32 _dstEid,
     string calldata _message,
+    bytes calldata _composeMsg,
     bytes calldata _options
   ) external payable returns (MessagingReceipt memory receipt) {
     bytes memory _payload = abi.encodePacked(
         abi.encode(uint256(bytes(_message).length)),
         bytes(_message),
+        _composeMsg
     );
+   uint8 msgType = _composeMsg.length > 0 ? StringMsgCodec.COMPOSED_TYPE : StringMsgCodec.VANILLA_TYPE;
-   bytes memory options = combineOptions(_dstEid, StringMsgCodec.VANILLA_TYPE, _options);
+   bytes memory options = combineOptions(_dstEid, msgType, _options);
// ...
   function quote(
        uint32 _dstEid,
        string calldata _message,
+       bytes calldata _composeMsg,
        bytes calldata _options,
        bool _payInLzToken
    ) public view returns (MessagingFee memory fee) {
        bytes memory payload = abi.encodePacked(
            abi.encode(uint256(bytes(_message).length)),
            bytes(_message),
            bytes(_message)
+           _composeMsg
        );
+        uint8 msgType = _composeMsg.length > 0 ? StringMsgCodec.COMPOSED_TYPE : StringMsgCodec.VANILLA_TYPE;
-       bytes memory options = combineOptions(_dstEid, StringMsgCodec.VANILLA_TYPE, _options);
+       bytes memory options = combineOptions(_dstEid, msgType, _options);
// ...
    function _lzReceive(
        Origin calldata /*_origin*/,
        bytes32 /*_guid*/,
        bytes calldata payload,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
_        (string memory stringValue) = StringMsgCodec.decode(payload);
+        (string memory stringValue, ) = StringMsgCodec.decode(payload); // TODO: use the last value from .decode()
        data = stringValue;
+       // TODO: process _composeMsg
    }
```

### `StringMsgCodec.sol`

```solidity
 library StringMsgCodec {
     uint8 public constant VANILLA_TYPE = 1;
+    uint8 public constant COMPOSED_TYPE = 2;
// ...
-    /// @notice Reconstructs `stringValue` from `_msg`.
-    function decode(bytes calldata _msg) internal pure returns (string memory stringValue) {
+    /// @notice Reconstructs `(stringValue, composeMsg)` from `_msg`.
+   function decode(bytes calldata _msg) internal pure returns (string memory stringValue, bytes memory composeMsg) {
// ...
        // 3) Extract the UTF-8 string
        stringValue = string(_msg[32:32 + N]);
-        // 4) Anything after that is ignored
+        // 4) Anything after that is `composeMsg`
+        if (_msg.length > 32 + N) {
+            composeMsg = _msg[32 + N:];
+        } else {
+            composeMsg = "";
+        }
+    }
+
+    /**
+     * @dev Checks if the _msg is composed.
+     * @param _msg The _msg.
+     * @return A boolean indicating whether the _msg is composed.
+     */
+    function isComposed(bytes calldata _msg) internal pure returns (bool) {
+        (, bytes memory composeMsg) = decode(_msg);
+        return composeMsg.length > 0;
// ...
```

Ensure you re-run `pnpm gen:api` to update the generated client code.
