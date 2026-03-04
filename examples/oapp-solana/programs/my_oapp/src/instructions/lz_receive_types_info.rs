use oapp::{
    lz_receive_types_v2::{LzReceiveTypesV2Accounts, LZ_RECEIVE_TYPES_VERSION},
    LzReceiveParams, LZ_RECEIVE_TYPES_SEED,
};

use crate::*;

/// LzReceiveTypesInfo instruction implements the versioning mechanism introduced in V2.
///
/// This instruction addresses the compatibility risk of the original LzReceiveType V1 design,
/// which lacked any formal versioning mechanism. The LzReceiveTypesInfo instruction allows
/// the Executor to determine how to interpret the structure of the data returned by
/// lz_receive_types() for different versions.
///
/// Returns (version, versioned_data):
/// - version: u8 — A protocol-defined version identifier for the LzReceiveType logic and return
///   type
/// - versioned_data: Any — A version-specific structure that the Executor decodes based on the
///   version
///
/// For Version 2, the versioned_data contains LzReceiveTypesV2Accounts which provides information
/// needed to construct the call to lz_receive_types_v2.
#[derive(Accounts)]
pub struct LzReceiveTypesInfo<'info> {
    #[account(seeds = [STORE_SEED], bump = store.bump)]
    pub store: Account<'info, Store>,

    /// PDA account containing the versioned data structure for V2
    /// Contains the accounts needed to construct lz_receive_types_v2 instruction
    #[account(seeds = [LZ_RECEIVE_TYPES_SEED, &store.key().to_bytes()], bump = lz_receive_types_accounts.bump)]
    pub lz_receive_types_accounts: Account<'info, LzReceiveTypesAccounts>,
}

impl LzReceiveTypesInfo<'_> {
    /// Returns the version and versioned data for LzReceiveTypes
    ///
    /// Version Compatibility:
    /// - Forward Compatibility: Executors must gracefully reject unknown versions
    /// - Backward Compatibility: Version 1 OApps do not implement lz_receive_types_info; Executors
    ///   may fall back to assuming V1 if the version instruction is missing or unimplemented
    ///
    /// For V2, returns:
    /// - version: 2 (u8)
    /// - versioned_data: LzReceiveTypesV2Accounts containing the accounts needed for
    ///   lz_receive_types_v2
    pub fn apply(
        ctx: &Context<LzReceiveTypesInfo>,
        _params: &LzReceiveParams,
    ) -> Result<(u8, LzReceiveTypesV2Accounts)> {
        let receive_types_account = &ctx.accounts.lz_receive_types_accounts;

        // If there are accounts that need to be dynamically derived based on contents of the message,
        // ...you can access params.message

        let required_accounts = if receive_types_account.alt == Pubkey::default() {
            vec![
                receive_types_account.store
                // You can include more accounts here if necessary
            ]
        } else {
            vec![
                receive_types_account.store,
                receive_types_account.alt,
                // You can include more accounts here if necessary
            ]
        };
        Ok((LZ_RECEIVE_TYPES_VERSION, LzReceiveTypesV2Accounts { accounts: required_accounts }))
    }
}