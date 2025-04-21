use solana_program::instruction::AccountMeta;
use solana_program::pubkey;
use solana_program::pubkey::Pubkey;
use solana_client::rpc_client::RpcClient;

use crate::{instructions, ExecutorPDA};

pub struct Executor {
    pub pda: ExecutorPDA,
    pub rpc: RpcClient,
}

impl Executor {
    pub fn new(program_id: Pubkey, rpc_url: String) -> Self {
        let pda = ExecutorPDA::new(program_id);
        let rpc = RpcClient::new(rpc_url);

        Self {
            pda,
            rpc,
        }
    }

    pub fn get_quote_ix_account_meta_for_cpi(&self, price_feed_config: Pubkey, price_feed_program: Pubkey, payment: bool) -> Result<Vec<AccountMeta>, String> {
        let tx_builder = instructions::QuoteExecutorBuilder::new()
           .executor_config(self.pda.config())
            .price_feed_config(price_feed_config)
            .price_feed_program(price_feed_program)
            
            // params
            .msglib(pubkey!("11111111111111111111111111111111"))
            .dst_eid(0)
            .sender(pubkey!("11111111111111111111111111111111"))
            .calldata_size(0)
            .options(vec![])
            .instruction();

        let mut ix_accounts = tx_builder.accounts;
        if payment {
            // if payment is required, the first account is required to be writable to receive the payment
            ix_accounts[0].is_writable = true;
        }

        Ok([
            AccountMeta {
                pubkey: self.pda.program,
                is_writable: false,
                is_signer: false,
            },
        ].to_vec().into_iter().chain(ix_accounts.into_iter()).collect())
    }
}
