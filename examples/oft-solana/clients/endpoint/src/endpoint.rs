use solana_program::instruction::AccountMeta;
use solana_program::pubkey;
use solana_program::pubkey::Pubkey;
use solana_client::rpc_client::RpcClient;
use uln_client::uln::Uln;
use crate::endpoint_pda::EndpointPDA;
use crate::generated::endpoint::accounts::SendLibraryConfig;
use crate::generated::endpoint::instructions;
use crate::EventPDA;
use solana_sdk::commitment_config::CommitmentConfig;

const DEFAULT_MESSAGE_LIB: Pubkey = pubkey!("11111111111111111111111111111111");

#[derive(Debug)]
pub struct SolanaPacketPath {
    pub sender: Pubkey,
    pub dst_eid: u32,
    pub receiver: [u8; 32],
}

pub struct GetQuoteIxAccountMetaForCpiParams {
    pub path: SolanaPacketPath,
    pub msg_lib_program: Uln,
}

pub struct GetSendIxAccountMetaForCpiParams {
    pub path: SolanaPacketPath,
    pub msg_lib_program: Uln,
    pub token_program: Option<Pubkey>,
    pub associated_token_program: Option<Pubkey>,
}

pub struct Endpoint {
    pub event_authority: Pubkey,
    pub pda: EndpointPDA,
    pub rpc: RpcClient,
}

impl Endpoint {
    pub fn new(program_id: Pubkey, rpc_url: String) -> Self {
        let pda = EndpointPDA::new(program_id);
        let rpc = RpcClient::new(rpc_url);
        let event_authority = EventPDA::new(program_id).event_authority();
        
        Self {
            event_authority,
            pda,
            rpc,
        }
    }

    pub async fn get_send_library(
        &self,
        oapp_pda: Pubkey,
        dst_eid: u32,
    ) -> Result<(Pubkey, Option<Pubkey>, bool), String> {
        let send_lib_config = self.pda.send_library_config(oapp_pda, dst_eid);
        let default_send_lib_config = self.pda.default_send_library_config(dst_eid);
        let send_lib_account = self.rpc.get_account(&send_lib_config);
        let default_send_lib_account = self.rpc.get_account(&default_send_lib_config);

        if send_lib_account.is_err() || default_send_lib_account.is_err() {
            return Err(format!("Unable to find defaultSendLibraryConfig/sendLibraryConfig account at {}/{}", default_send_lib_config, send_lib_config));
        }

        let send_lib_config_info = SendLibraryConfig::from_bytes(&send_lib_account.unwrap().data)
            .map_err(|e| format!("Failed to parse send library config: {}", e))?;
        let default_send_lib_config_info = SendLibraryConfig::from_bytes(&default_send_lib_account.unwrap().data)
            .map_err(|e| format!("Failed to parse default send library config: {}", e))?;

        let is_default = send_lib_config_info.message_lib == DEFAULT_MESSAGE_LIB;

        let msg_lib = if is_default {
            default_send_lib_config_info.message_lib
        } else {
            send_lib_config_info.message_lib
        };

        let msg_lib_info = self.rpc.get_account(&msg_lib);

        if let Ok(msg_lib_info) = msg_lib_info {
            return Ok((msg_lib, Some(msg_lib_info.owner), is_default));
        } else {
            return Ok((msg_lib, None, is_default));
        }
    }

    pub async fn get_quote_ix_account_meta_for_cpi(
        &self,
        _payer: Pubkey,
        params: GetQuoteIxAccountMetaForCpiParams,
    ) -> Result<Vec<AccountMeta>, String> {
        let (msg_lib, send_lib_program_id, _is_default_send_lib) = self.get_send_library(params.path.sender, params.path.dst_eid).await.unwrap();
        if send_lib_program_id.is_none() {
            return Err("default send library not initialized or blocked message lib".to_string());
        }

        let send_library_config = self.pda.send_library_config(params.path.sender, params.path.dst_eid);
        let nonce = self.pda.nonce(params.path.sender, params.path.dst_eid, params.path.receiver);

        let ix = instructions::QuoteBuilder::new()
            .send_library_config(send_library_config)
            .send_library_program(send_lib_program_id.unwrap())
            .default_send_library_config(self.pda.default_send_library_config(params.path.dst_eid))
            .send_library_info(self.pda.message_library_info(msg_lib))
            .endpoint(self.pda.setting())
            .nonce(nonce)

            // params
            .sender(pubkey!("11111111111111111111111111111111"))
            .dst_eid(0)
            .receiver([0; 32])
            .message(vec![])
            .options(vec![])
            .pay_in_lz_token(false)
            .instruction();

        let remaining_accounts = params.msg_lib_program.get_quote_ix_account_meta_for_cpi(uln_client::uln::GetQuoteIxAccountMetaForCpiParams {
            path: uln_client::uln::SolanaPacketPath {
                sender: params.path.sender,
                dst_eid: params.path.dst_eid,
                receiver: params.path.receiver,
            },
        }, None)?;
        let mut account_metas = vec![];
        account_metas.push(AccountMeta::new_readonly(self.pda.program, false));
        account_metas.extend(ix.accounts);
        account_metas.extend(remaining_accounts);
        Ok(account_metas)
    }

    pub async fn get_send_ix_account_meta_for_cpi(
        &self,
        payer: Pubkey,
        params: GetSendIxAccountMetaForCpiParams,
        commitment: Option<CommitmentConfig>,
    ) -> Result<Vec<AccountMeta>, String> {
        let commitment = commitment.unwrap_or(CommitmentConfig::confirmed());
        let (send_library, send_lib_program_id, _is_default_send_lib) = self.get_send_library(params.path.sender, params.path.dst_eid).await.unwrap();
        if send_lib_program_id.is_none() {
            return Err("default send library not initialized or blocked message lib".to_string());
        }

        let send_library_config = self.pda.send_library_config(params.path.sender, params.path.dst_eid);
        let nonce = self.pda.nonce(params.path.sender, params.path.dst_eid, params.path.receiver);

        let ix = instructions::SendBuilder::new()
            .sender(params.path.sender)
            .send_library_program(send_lib_program_id.unwrap())
            .send_library_config(send_library_config)
            .default_send_library_config(self.pda.default_send_library_config(params.path.dst_eid))
            .send_library_info(self.pda.message_library_info(send_library))
            .endpoint(self.pda.setting())
            .program(self.pda.program)
            .nonce(nonce)
            .event_authority(self.event_authority)

            // params
            .dst_eid(0)
            .receiver([0; 32])
            .message(vec![])
            .options(vec![])
            .native_fee(0)
            .lz_token_fee(0)
            .instruction();

        let remaining_accounts = params.msg_lib_program.get_send_ix_account_meta_for_cpi(payer, uln_client::uln::SolanaPacketPath {
            sender: params.path.sender,
            dst_eid: params.path.dst_eid,
            receiver: params.path.receiver,
        }, Some(commitment))?;
    
        let mut account_metas = vec![];
        account_metas.push(AccountMeta::new_readonly(self.pda.program, false));
        account_metas.extend(ix.accounts);
        account_metas.extend(remaining_accounts);
        account_metas = account_metas.into_iter().map(|mut key| {
            key.is_signer = false;
            key
        }).collect();
        Ok(account_metas)
    }
}

#[cfg(test)]
mod tests {
    use solana_program::pubkey;
    use uln_client::programs::ULN_ID;

    use crate::ENDPOINT_ID;

    use super::*;

    #[tokio::test(flavor = "multi_thread")]
    async fn test_endpoint_new() {
        let oapp_id = pubkey!("HUPW9dJZxxSafEVovebGxgbac3JamjMHXiThBxY5u43M");
        let dst_eid = 40106; // fuji
        let endpoint = Endpoint::new(ENDPOINT_ID, "https://api.devnet.solana.com".to_string());

        let accounts = endpoint.get_quote_ix_account_meta_for_cpi(oapp_id, GetQuoteIxAccountMetaForCpiParams {
            path: SolanaPacketPath {
                sender: oapp_id,
                dst_eid,
                receiver: hex::decode("00000000000000000000000089e5fD9975e67A27dbbd2af085f4a5627AC14eD9")
                    .expect("Invalid hex string")
                    .try_into()
                    .expect("Invalid length"),
            },
            msg_lib_program: Uln::new(ULN_ID, "https://api.devnet.solana.com".to_string()),
        }).await.unwrap();
        println!("accounts: {:?}", accounts);

        assert_eq!(accounts[0].pubkey, pubkey!("76y77prsiCMvXMjuoZ5VRrhG5qYBrUMYTE5WgHqgjEn6"));
        assert_eq!(accounts[1].pubkey, pubkey!("7a4WjyR8VZ7yZz5XJAKm39BUGn5iT9CKcv2pmG9tdXVH"));
        assert_eq!(accounts[2].pubkey, pubkey!("8Kx7Q7vredpvHaK7a3NEDdveQrqnpwUSfZurxTXAaEqH")); // SendLibraryConfig
        assert_eq!(accounts[3].pubkey, pubkey!("911rFremHQR6Z9pPJVNchkg5GmZzysbsg3hk9NppooPM")); // SendLibraryConfig
        assert_eq!(accounts[4].pubkey, pubkey!("526PeNZfw8kSnDU4nmzJFVJzJWNhwmZykEyJr5XWz5Fv"));
        assert_eq!(accounts[5].pubkey, pubkey!("2uk9pQh3tB5ErV7LGQJcbWjb4KeJ2UJki5qJZ8QG56G3")); // EndpointSettings
        assert_eq!(accounts[6].pubkey, pubkey!("D6vis7fffY53WCXL7EZPLbsLKhLgmg16PyDXytShypfz")); // Nonce
        assert_eq!(accounts[7].pubkey, pubkey!("2XgGZG4oP29U3w5h4nTk1V2LFHL23zKDPJjs3psGzLKQ"));
        assert_eq!(accounts[8].pubkey, pubkey!("6JVxntrMiSckkojEiPk4pNMkVDVfAicjZKWNxzf56UmY"));
        assert_eq!(accounts[9].pubkey, pubkey!("AnF6jGBQykDchX1EjmQePJwJBCh9DSbZjYi14Hdx5BRx"));
        assert_eq!(accounts[10].pubkey, pubkey!("6doghB248px58JSSwG4qejQ46kFMW4AMj7vzJnWZHNZn"));
        assert_eq!(accounts[11].pubkey, pubkey!("AwrbHeCyniXaQhiJZkLhgWdUCteeWSGaSN1sTfLiY7xK"));
        assert_eq!(accounts[12].pubkey, pubkey!("8ahPGPjEbpgGaZx2NV1iG5Shj7TDwvsjkEDcGWjt94TP"));
        assert_eq!(accounts[13].pubkey, pubkey!("CSFsUupvJEQQd1F4SsXGACJaxQX4eropQMkGV2696eeQ"));
        assert_eq!(accounts[14].pubkey, pubkey!("HtEYV4xB4wvsj5fgTkcfuChYpvGYzgzwvNhgDZQNh7wW"));
        assert_eq!(accounts[15].pubkey, pubkey!("4VDjp6XQaxoZf5RGwiPU9NR1EXSZn2TP4ATMmiSzLfhb"));
        assert_eq!(accounts[16].pubkey, pubkey!("8ahPGPjEbpgGaZx2NV1iG5Shj7TDwvsjkEDcGWjt94TP"));
        assert_eq!(accounts[17].pubkey, pubkey!("CSFsUupvJEQQd1F4SsXGACJaxQX4eropQMkGV2696eeQ"));
        assert_eq!(accounts.len(), 18);
    }
}

