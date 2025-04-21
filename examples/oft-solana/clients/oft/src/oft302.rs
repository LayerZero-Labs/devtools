use base64::Engine;
use borsh::BorshDeserialize;
use endpoint_client::{programs::ENDPOINT_ID, Endpoint};
use solana_client::{rpc_client::RpcClient, rpc_config::RpcSimulateTransactionConfig};
use solana_program::{instruction::AccountMeta, pubkey::Pubkey};
use solana_sdk::{instruction::Instruction, message::Message, pubkey};
use uln_client::uln::Uln;

use crate::{accounts::fetch_peer_config, event_pda::EventPDA, instructions::{SendBuilder, SendInstructionArgs}, oft_pda::OftPDA, types::MessagingFee};

const TOKEN_PROGRAM_ID: Pubkey = pubkey!("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

pub struct Oft302 {
    pub pda: OftPDA,
    pub rpc: RpcClient,
}

impl Oft302 {
    pub fn new(program_id: Pubkey, rpc_url: String) -> Self {
        let pda = OftPDA::new(program_id);
        let rpc = RpcClient::new(rpc_url);

        Self { pda, rpc }
    }
    
    pub async fn quote(
        &self,
        accounts: Oft302Accounts,
        quote_params: Oft302QuoteParams,
        programs: Oft302Programs,
        remaining_accounts_param: Vec<AccountMeta>,
    ) -> Result<MessagingFee, String> {
        let endpoint = Endpoint::new(programs.endpoint.unwrap_or(ENDPOINT_ID), self.rpc.url().clone());
        let oft_store = self.pda.oft_store(accounts.token_escrow);
        let peer = self.pda.peer(oft_store, quote_params.dst_eid);
        let message_lib = self.get_send_library_program(endpoint, oft_store, quote_params.dst_eid).await?;

        let mut remaining_accounts: Vec<AccountMeta> = vec![];

        if remaining_accounts_param.is_empty() {
            let peer_addr = if let Some(peer_address) = accounts.peer_address {
                peer_address
            } else {
                let peer_config = fetch_peer_config(&self.rpc, &peer).map_err(|err| err.to_string())?;
                peer_config.data.peer_address
            };

            remaining_accounts = Endpoint::new(programs.endpoint.unwrap_or(ENDPOINT_ID), self.rpc.url().clone()).get_quote_ix_account_meta_for_cpi(accounts.payer, endpoint_client::endpoint::GetQuoteIxAccountMetaForCpiParams {
                path: endpoint_client::endpoint::SolanaPacketPath {
                    sender: oft_store,
                    dst_eid: quote_params.dst_eid,
                    receiver: peer_addr,
                },
                msg_lib_program: message_lib,
            }).await?;
        }

        let mut ix = crate::generated::oft::instructions::QuoteSendBuilder::new()
            .oft_store(oft_store)
            .peer(peer)
            .token_mint(accounts.token_mint)
            // params
            .dst_eid(quote_params.dst_eid)
            .to(quote_params.to)
            .amount_ld(quote_params.amount_ld)
            .min_amount_ld(quote_params.min_amount_ld)
            .options(vec![])
            .pay_in_lz_token(false)
            .instruction();

        ix.program_id = self.pda.program;
        ix.accounts.extend(remaining_accounts);

        let recent_blockhash = self.rpc.get_latest_blockhash().unwrap();
        let message = Message::new_with_blockhash(&[ix], Some(&accounts.payer), &recent_blockhash);

        let transaction = solana_sdk::transaction::Transaction::new_unsigned(
            message,
        );
        
        let config = RpcSimulateTransactionConfig {
            sig_verify: false,
            ..RpcSimulateTransactionConfig::default()
        };
        let result = self.rpc.simulate_transaction_with_config(&transaction, config).unwrap();
        let decoded = base64::engine::general_purpose::STANDARD.decode(result.value.return_data.unwrap().data.0).unwrap();

        Ok(MessagingFee::try_from_slice(&decoded).map_err(|err| format!("Failed to parse messaging fee: {}", err))?)
    }

    pub async fn send(&self, accounts: Oft302SendAccounts, send_params: SendInstructionArgs, programs: Oft302SendPrograms, remaining_accounts_param: Vec<AccountMeta>) -> Result<Instruction, String> {
        let endpoint = Endpoint::new(programs.endpoint.unwrap_or(ENDPOINT_ID), self.rpc.url().clone());
        let oft_store = self.pda.oft_store(accounts.token_escrow);
        let peer = self.pda.peer(oft_store, send_params.dst_eid);
        let message_lib = self.get_send_library_program(endpoint, oft_store, send_params.dst_eid).await?;

        let mut remaining_accounts: Vec<AccountMeta> = vec![];

        if remaining_accounts_param.is_empty() {
            let peer_addr = if let Some(peer_address) = accounts.peer_address {
                peer_address
            } else {
                let peer_config = fetch_peer_config(&self.rpc, &peer).map_err(|err| err.to_string())?;
                peer_config.data.peer_address
            };

            remaining_accounts = Endpoint::new(programs.endpoint.unwrap_or(ENDPOINT_ID), self.rpc.url().clone())
                .get_send_ix_account_meta_for_cpi(accounts.payer, endpoint_client::endpoint::GetSendIxAccountMetaForCpiParams {
                    path: endpoint_client::endpoint::SolanaPacketPath {
                        sender: oft_store,
                        dst_eid: send_params.dst_eid,
                        receiver: peer_addr,
                    },
                    msg_lib_program: message_lib,
                    token_program: None,
                    associated_token_program: None,
                }, None).await?;
        }

        let event_authority = EventPDA::new(self.pda.program).event_authority();
        let token_program = programs.token.unwrap_or(TOKEN_PROGRAM_ID);

        let mut ix = SendBuilder::new()
            .signer(accounts.payer)
            .peer(peer)
            .oft_store(oft_store)
            .token_source(accounts.token_source)
            .token_escrow(accounts.token_escrow)
            .token_mint(accounts.token_mint)
            .token_program(token_program)
            .event_authority(event_authority)
            .program(self.pda.program)
            // params
            .dst_eid(send_params.dst_eid)
            .to(send_params.to)
            .amount_ld(send_params.amount_ld)
            .min_amount_ld(send_params.min_amount_ld)
            .options(send_params.options)
            .compose_msg(send_params.compose_msg.unwrap_or(vec![]))
            .native_fee(send_params.native_fee)
            .lz_token_fee(send_params.lz_token_fee)
            .instruction();

        ix.program_id = self.pda.program;
        ix.accounts.extend(remaining_accounts);

        Ok(ix)
    }

    pub async fn get_send_library_program(&self, endpoint: Endpoint, oft_store: Pubkey, remote_eid: u32) -> Result<Uln, String> {
        let (_, send_lib_program_id, _) = endpoint.get_send_library(oft_store, remote_eid).await.unwrap();

        if send_lib_program_id.is_none() {
            return Err("Send library not initialized or blocked message library".to_string());
        }

        let uln = Uln::new(send_lib_program_id.unwrap(), self.rpc.url().clone());
        Ok(uln)
    }
}

#[derive(Debug, Clone)]
pub struct Oft302Accounts {
    payer: Pubkey,
    token_mint: Pubkey,
    token_escrow: Pubkey,
    peer_address: Option<[u8; 32]>,
}

#[derive(Debug, Clone)]
pub struct Oft302SendAccounts {
    payer: Pubkey,
    token_mint: Pubkey,
    token_escrow: Pubkey,
    token_source: Pubkey,
    peer_address: Option<[u8; 32]>,
}

#[derive(Debug, Clone)]
pub struct Oft302QuoteParams {
    dst_eid: u32,
    to: [u8; 32],
    amount_ld: u64,
    min_amount_ld: u64,
}   

#[derive(Debug, Clone)]
pub struct Oft302Programs {
    endpoint: Option<Pubkey>,
}

#[derive(Debug, Clone)]
pub struct Oft302SendPrograms {
    endpoint: Option<Pubkey>,
    token: Option<Pubkey>,
}

#[cfg(test)]
mod tests {
    use crate::types::OFTReceipt;

    use super::*;
    use endpoint_client::types::MessagingReceipt;
    use solana_program::pubkey;

    #[tokio::test(flavor = "multi_thread")]
    async fn test_quote() {
        let rpc_url = "https://api.devnet.solana.com".to_string();
        let oft_program_id = pubkey!("E2R6qMMzLBjCwXs66MPEg2zKfpt5AMxWNgSULsLYfPS2");
        let remote_eid = 40106; // example eid

        let oft = Oft302::new(oft_program_id, rpc_url.clone());
        let accounts = Oft302Accounts {
            payer: pubkey!("Fty7h4FYAN7z8yjqaJExMHXbUoJYMcRjWYmggSxLbHp8"),
            token_mint: pubkey!("AtGakZsHVY1BkinHEFMEJxZYhwA9KnuLD8QRmGjSAZEC"),
            token_escrow: pubkey!("HwpzV5qt9QzYRuWkHqTRuhbqtaMhapSNuriS5oMynkny"),
            peer_address: None,
        };

        let quote_params = Oft302QuoteParams {
            dst_eid: remote_eid,
            to: hex::decode("0000000000000000000000000804a6e2798F42C7F3c97215DdF958d5500f8ec8")
                .expect("Invalid hex string")
                .try_into()
                .expect("Invalid length"),
            amount_ld: 1000000000,
            min_amount_ld: 1000000000,
        };
        
        let result = oft.quote(accounts, quote_params, Oft302Programs { endpoint: None }, vec![]).await;
        println!("result: {:?}", result);
        assert!(result.is_ok(), "Quote result should be Ok");
        let quote = result.unwrap();
        assert!(quote.native_fee > 0, "Native fee should be higher than 0");
        assert_eq!(quote.lz_token_fee, 0, "LZ token fee should be 0");
    }

    #[tokio::test(flavor = "multi_thread")]
    async fn test_send() {
        let rpc_url = "https://api.devnet.solana.com".to_string();
        let oft_program_id = pubkey!("E2R6qMMzLBjCwXs66MPEg2zKfpt5AMxWNgSULsLYfPS2");
        let remote_eid = 40106; // example eid

        let oft = Oft302::new(oft_program_id, rpc_url.clone());

        let quote_accounts = Oft302Accounts {
            payer: pubkey!("Fty7h4FYAN7z8yjqaJExMHXbUoJYMcRjWYmggSxLbHp8"),
            token_mint: pubkey!("AtGakZsHVY1BkinHEFMEJxZYhwA9KnuLD8QRmGjSAZEC"),
            token_escrow: pubkey!("HwpzV5qt9QzYRuWkHqTRuhbqtaMhapSNuriS5oMynkny"),
            peer_address: None,
        };
        
        let quote_params = Oft302QuoteParams {
            dst_eid: remote_eid,
            to: hex::decode("0000000000000000000000000804a6e2798F42C7F3c97215DdF958d5500f8ec8")
                .expect("Invalid hex string")
                .try_into()
                .expect("Invalid length"),
            amount_ld: 1000000000,
            min_amount_ld: 1000000000,
        };

        let quote = oft.quote(quote_accounts.clone(), quote_params.clone(), Oft302Programs { endpoint: None }, vec![]).await.unwrap();
        println!("quote: {:?}", quote);

        let send_accounts = Oft302SendAccounts {
            payer: quote_accounts.payer,
            token_mint: quote_accounts.token_mint,
            token_escrow: quote_accounts.token_escrow,
            token_source: pubkey!("3Qq7GD6V3mK1do7Ch7JMr9LdUu4Lv3EZ4qJcggw1eyR6"),
            peer_address: None,
        };

        let send_params = SendInstructionArgs {
            dst_eid: remote_eid,
            to: hex::decode("0000000000000000000000000804a6e2798F42C7F3c97215DdF958d5500f8ec8")
                .expect("Invalid hex string")
                .try_into()
                .expect("Invalid length"),
            compose_msg: None,
            options: vec![],
            native_fee: quote.native_fee,
            lz_token_fee: quote.lz_token_fee,
            amount_ld: quote_params.amount_ld,
            min_amount_ld: quote_params.min_amount_ld,
        };
        
        let ix = oft.send(send_accounts.clone(), send_params, Oft302SendPrograms { endpoint: None, token: None }, vec![]).await.unwrap();
        let compute_unit_ix = solana_sdk::compute_budget::ComputeBudgetInstruction::set_compute_unit_limit(1_000_000);
        let recent_blockhash = oft.rpc.get_latest_blockhash().unwrap();
        let message = Message::new_with_blockhash(&[compute_unit_ix, ix], Some(&send_accounts.payer), &recent_blockhash);

        let transaction = solana_sdk::transaction::Transaction::new_unsigned(
            message,
        );

        println!("--------------------------------");
        println!("{}", base64::engine::general_purpose::STANDARD.encode(transaction.message_data()));
        println!("--------------------------------");
        
        let config = RpcSimulateTransactionConfig {
            sig_verify: false,
            ..RpcSimulateTransactionConfig::default()
        };
        let result = oft.rpc.simulate_transaction_with_config(&transaction, config).unwrap();
        println!("result: {:?}", result);

        let decoded = base64::engine::general_purpose::STANDARD.decode(result.value.return_data.unwrap().data.0).unwrap();
        let (messaging_receipt, oft_receipt) = <(MessagingReceipt, OFTReceipt)>::try_from_slice(&decoded).map_err(|err| format!("Failed to parse result: {}", err)).unwrap();
        println!("messaging_receipt: {:?}", messaging_receipt);
        println!("oft_receipt: {:?}", oft_receipt);
    }
}
