use std::collections::HashMap;

use dvn_client::accounts::DvnConfig;
use dvn_client::Dvn;
use executor_client::accounts::ExecutorConfig;
use executor_client::programs::EXECUTOR_ID;
use executor_client::Executor;
use solana_client::rpc_config::RpcAccountInfoConfig;
use solana_program::instruction::AccountMeta;
use solana_program::pubkey;
use solana_program::pubkey::Pubkey;
use solana_client::rpc_client::RpcClient;
use crate::accounts::{SendConfig, UlnSettings};
use crate::event_pda::EventPDA;
use crate::types::Packet;
use crate::uln_pda::UlnPDA;
use crate::generated::uln::instructions;
use solana_sdk::commitment_config::CommitmentConfig;

pub struct SolanaPacketPath {
    pub sender: Pubkey,
    pub dst_eid: u32,
    pub receiver: [u8; 32],
}

pub struct GetQuoteIxAccountMetaForCpiParams {
    pub path: SolanaPacketPath,
}

pub struct GetSendIxRemainingAccountsParams {
    pub sender: Pubkey,
    pub dst_eid: u32,
    pub payment: bool,
}

#[derive(Debug)]
pub struct ExecutorWorker {
    pub config: ExecutorConfig,
    pub owner: Pubkey,
}

#[derive(Debug, Clone)]
pub struct DvnWorker {
    pub config: DvnConfig,
    pub owner: Pubkey,
}

#[derive(Debug)]
pub struct Workers {
    pub executor: ExecutorWorker,
    pub dvns: Vec<DvnWorker>,
}

pub struct Uln {
    pub event_authority: Pubkey,
    pub pda: UlnPDA,
    pub rpc: RpcClient,
}

impl Uln {
    pub fn new(program_id: Pubkey, rpc_url: String) -> Self {
        let pda = UlnPDA::new(program_id);
        let rpc = RpcClient::new(rpc_url);
        let event_authority = EventPDA::new(program_id).event_authority();

        Self {
            event_authority,
            pda,
            rpc,
        }
    }

    pub fn get_quote_ix_account_meta_for_cpi(&self, params: GetQuoteIxAccountMetaForCpiParams, commitment: Option<CommitmentConfig>) -> Result<Vec<AccountMeta>, String> {
        let commitment = commitment.unwrap_or(CommitmentConfig::confirmed());

        let tx_builder = instructions::QuoteBuilder::new()
            .endpoint(pubkey!("11111111111111111111111111111111"))
            .uln(self.pda.setting())
            .send_config(self.pda.send_config(params.path.sender, params.path.dst_eid))
            .default_send_config(self.pda.default_send_config(params.path.dst_eid))

            .packet(Packet {
                nonce: 0,
                src_eid: 0,
                sender: pubkey!("11111111111111111111111111111111"),
                dst_eid: 0,
                receiver: [0; 32],
                guid: [0; 32],
                message: vec![],
            })
            .options(vec![])
            .pay_in_lz_token(false)
            .instruction();

        let remaining_accounts = self.get_send_ix_remaining_accounts(GetSendIxRemainingAccountsParams {
            sender: params.path.sender,
            dst_eid: params.path.dst_eid,
            payment: false,
        }, Some(commitment))?;

        Ok(tx_builder.accounts[1..].iter().cloned().chain(remaining_accounts.into_iter()).collect())
    }

    pub fn get_send_ix_account_meta_for_cpi(&self, payer: Pubkey, path: SolanaPacketPath, commitment: Option<CommitmentConfig>) -> Result<Vec<AccountMeta>, String> {
        let commitment = commitment.unwrap_or(CommitmentConfig::confirmed());
        let uln_state = self.get_setting(Some(commitment))?;
        let treasury: Option<Pubkey> = uln_state.treasury.map(|t| t.native_receiver);

        let tx_builder = instructions::SendBuilder::new()
            .endpoint(pubkey!("11111111111111111111111111111111"))
            .payer(payer)
            .uln(self.pda.setting())
            .send_config(self.pda.send_config(path.sender, path.dst_eid))
            .default_send_config(self.pda.default_send_config(path.dst_eid))
            .treasury(treasury)
            .event_authority(self.event_authority)
            .program(self.pda.program)

            // params
            .packet(Packet {
                nonce: 0,
                src_eid: 0,
                sender: pubkey!("11111111111111111111111111111111"),
                dst_eid: 0,
                receiver: [0; 32],
                guid: [0; 32],
                message: vec![],
            })
            .options(vec![])
            .native_fee(0)
            .instruction();

        let remaining_accounts = self.get_send_ix_remaining_accounts(GetSendIxRemainingAccountsParams {
            sender: path.sender,
            dst_eid: path.dst_eid,
            payment: true,
        }, Some(commitment))?;

        Ok(tx_builder.accounts[1..].iter().cloned().chain(remaining_accounts.into_iter()).map(|mut key| {
            if payer != key.pubkey {
                key.is_signer = false;
            }
            if treasury.is_some() && key.pubkey == treasury.unwrap() {
                key.is_writable = true;
            }
            key
        }).collect())
    }

    pub fn get_send_ix_remaining_accounts(&self, params: GetSendIxRemainingAccountsParams, commitment: Option<CommitmentConfig>) -> Result<Vec<AccountMeta>, String> {
        let commitment = commitment.unwrap_or(CommitmentConfig::confirmed());
        
        let workers = self.get_workers(params.sender, params.dst_eid, Some(commitment))?;
        let executor = workers.executor;
        let dvns = workers.dvns;

        let mut price_feeds = vec![];
        price_feeds.push(executor.config.price_feed);
        for dvn in dvns.clone() {
            let price_feed = dvn.config.price_feed;
            if !price_feeds.contains(&price_feed) {
                price_feeds.push(price_feed);
            }
        }

        let price_feeds_accounts = self.rpc.get_multiple_accounts_with_config(
            &price_feeds, 
            RpcAccountInfoConfig { commitment: Some(commitment), ..Default::default() })
            .map_err(|e| format!("Failed to get price feeds accounts: {}", e)).unwrap().value;

        let mut price_feed_owners_dictionary = HashMap::new();
        for (i, price_feed_account) in price_feeds_accounts.iter().enumerate() {
            if let Some(price_feed_account) = price_feed_account {
                price_feed_owners_dictionary.insert(price_feeds[i], price_feed_account.owner);
            } else {
                return Err(format!("priceFeed not initialized"));
            }
        }

        let executor_accounts = Executor::new(EXECUTOR_ID, self.rpc.url().clone())
            .get_quote_ix_account_meta_for_cpi(executor.config.price_feed, price_feeds_accounts[0].as_ref().unwrap().owner, params.payment)?;
        let mut dvn_accounts: Vec<AccountMeta> = vec![];
        for dvn in dvns {
            let dvn_account_meta = Dvn::new(dvn.owner, self.rpc.url().clone())
                .get_quote_ix_account_meta_for_cpi(dvn.config.price_feed, price_feed_owners_dictionary[&dvn.config.price_feed], params.payment)?;
            dvn_accounts.extend(dvn_account_meta);
        }

        Ok(executor_accounts.into_iter().chain(dvn_accounts.into_iter()).collect())
    }
    
    pub fn get_setting(&self, commitment: Option<CommitmentConfig>) -> Result<UlnSettings, String> {
        let commitment = commitment.unwrap_or(CommitmentConfig::confirmed());
    
        let setting = self.rpc.get_account_with_commitment(&self.pda.setting(), commitment)
            .map_err(|e| format!("Failed to get setting account: {}", e))?;

        Ok(UlnSettings::from_bytes(&setting.value.unwrap().data)
            .map_err(|e| format!("Failed to parse setting account: {}", e))?)
    }

    pub fn get_workers(&self, sender: Pubkey, eid: u32, commitment: Option<CommitmentConfig>) -> Result<Workers, String> {
        let commitment = commitment.unwrap_or(CommitmentConfig::confirmed());
        let default_send_config = self.pda.default_send_config(eid);
        let send_config = self.pda.send_config(sender, eid);
        let send_lib_account = self.rpc.get_account(&send_config);
        let default_send_lib_account = self.rpc.get_account(&default_send_config);
        if default_send_lib_account.is_err() {
            return Err("defaultSendConfig not initialized".to_string());
        }

        let default_send_lib_config_info = SendConfig::from_bytes(&default_send_lib_account.unwrap().data)
            .map_err(|e| format!("Failed to parse default send config: {}", e))?;

        let send_lib_config_info = SendConfig::from_bytes(&send_lib_account.unwrap().data)
            .map_err(|e| format!("Failed to parse send config: {}", e))?;

        let mut executor = default_send_lib_config_info.executor;
        let mut required_dvns = default_send_lib_config_info.uln.required_dvns;
        let mut optional_dvns = default_send_lib_config_info.uln.optional_dvns;

        if send_lib_config_info.executor.executor != pubkey!("11111111111111111111111111111111") {
            executor = send_lib_config_info.executor;
        }

        if send_lib_config_info.uln.required_dvns.len() > 0 {
            required_dvns = send_lib_config_info.uln.required_dvns.iter().filter(|&&dvn| dvn != pubkey!("11111111111111111111111111111111")).cloned().collect();
        }

        if send_lib_config_info.uln.optional_dvns.len() > 0 {
            optional_dvns = send_lib_config_info.uln.optional_dvns.iter().filter(|&&dvn| dvn != pubkey!("11111111111111111111111111111111")).cloned().collect();
        }

        let executor_account = self.rpc.get_account_with_commitment(&executor.executor, commitment)
            .map_err(|e| format!("Failed to get executor account: {}", e))?
            .value.ok_or_else(|| "Executor not initialized".to_string())?;

        let dvns_pubkeys = required_dvns.iter().chain(optional_dvns.iter()).collect::<Vec<_>>();
        let dvns_accounts = self.rpc.get_multiple_accounts_with_config(
            &dvns_pubkeys.iter().map(|&dvn| *dvn).collect::<Vec<Pubkey>>(), 
            RpcAccountInfoConfig { commitment: Some(commitment), ..Default::default() })
            .map_err(|e| format!("Failed to get dvns accounts: {}", e))?.value;

        let mut dvns = vec![];
        for (i, dvn_account) in dvns_accounts.iter().enumerate() {
            if dvn_account.is_none() {
                return Err(format!("dvn:{} not initialized", dvns_pubkeys[i]));
            }

            let dvn_account = dvn_account.clone().unwrap();

            let dvn_data = DvnConfig::from_bytes(&dvn_account.data)
                .map_err(|e| format!("Failed to parse dvn account: {}", e))?;

            dvns.push(DvnWorker { config: dvn_data, owner: dvn_account.owner });
        }

        println!("executor: {:?}", executor);
        println!("required_dvns: {:?}", required_dvns);
        println!("optional_dvns: {:?}", optional_dvns);

        Ok(Workers {
            executor: ExecutorWorker {
                config: ExecutorConfig::from_bytes(&executor_account.data)
                    .map_err(|e| format!("Failed to parse executor account: {}", e))?,
                owner: executor_account.owner,
            },
            dvns: dvns,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_get_quote_ix_account_meta_for_cpi() {
        let uln = Uln::new(pubkey!("7a4WjyR8VZ7yZz5XJAKm39BUGn5iT9CKcv2pmG9tdXVH"), "https://api.devnet.solana.com".to_string());
        let receiver = hex::decode("0000000000000000000000000804a6e2798F42C7F3c97215DdF958d5500f8ec8")
            .expect("Invalid hex string")
            .try_into()
            .expect("Invalid length");
        let params = GetQuoteIxAccountMetaForCpiParams {
            path: SolanaPacketPath { sender: pubkey!("HUPW9dJZxxSafEVovebGxgbac3JamjMHXiThBxY5u43M"), dst_eid: 40106, receiver },
        };
        let account_metas = uln.get_quote_ix_account_meta_for_cpi(params, None).unwrap();
        println!("account_metas: {:?}", account_metas);

        assert_eq!(account_metas[0].pubkey, pubkey!("2XgGZG4oP29U3w5h4nTk1V2LFHL23zKDPJjs3psGzLKQ"));
        assert_eq!(account_metas[1].pubkey, pubkey!("6JVxntrMiSckkojEiPk4pNMkVDVfAicjZKWNxzf56UmY"));
        assert_eq!(account_metas[2].pubkey, pubkey!("AnF6jGBQykDchX1EjmQePJwJBCh9DSbZjYi14Hdx5BRx"));
        assert_eq!(account_metas[3].pubkey, pubkey!("6doghB248px58JSSwG4qejQ46kFMW4AMj7vzJnWZHNZn"));
        assert_eq!(account_metas[4].pubkey, pubkey!("AwrbHeCyniXaQhiJZkLhgWdUCteeWSGaSN1sTfLiY7xK"));
        assert_eq!(account_metas[5].pubkey, pubkey!("8ahPGPjEbpgGaZx2NV1iG5Shj7TDwvsjkEDcGWjt94TP"));
        assert_eq!(account_metas[6].pubkey, pubkey!("CSFsUupvJEQQd1F4SsXGACJaxQX4eropQMkGV2696eeQ"));
        assert_eq!(account_metas[7].pubkey, pubkey!("HtEYV4xB4wvsj5fgTkcfuChYpvGYzgzwvNhgDZQNh7wW"));
        assert_eq!(account_metas[8].pubkey, pubkey!("4VDjp6XQaxoZf5RGwiPU9NR1EXSZn2TP4ATMmiSzLfhb"));
        assert_eq!(account_metas[9].pubkey, pubkey!("8ahPGPjEbpgGaZx2NV1iG5Shj7TDwvsjkEDcGWjt94TP"));
        assert_eq!(account_metas[10].pubkey, pubkey!("CSFsUupvJEQQd1F4SsXGACJaxQX4eropQMkGV2696eeQ"));

        assert_eq!(account_metas.len(), 11);
    }

    #[test]
    fn test_get_workers() {
        let uln = Uln::new(pubkey!("7a4WjyR8VZ7yZz5XJAKm39BUGn5iT9CKcv2pmG9tdXVH"), "https://api.devnet.solana.com".to_string());
        let workers = uln.get_workers(pubkey!("HUPW9dJZxxSafEVovebGxgbac3JamjMHXiThBxY5u43M"), 40106, None);
        println!("workers: {:?}", workers);
    }
}
