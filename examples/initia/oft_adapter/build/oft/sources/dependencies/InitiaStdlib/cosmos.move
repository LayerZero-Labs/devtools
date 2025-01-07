/// This module provides interfaces to allow CosmosMessage
/// execution after the move execution finished.
module initia_std::cosmos {
    use std::address;
    use std::signer;
    use std::vector;
    use std::string::{Self, String};
    use std::object::Object;
    use std::fungible_asset::Metadata;
    use std::collection::{Collection};
    use std::error;
    use std::coin::metadata_to_denom;
    use std::collection::collection_to_class_id;
    use std::base64;

    use initia_std::json;

    // Error codes
    const EINVALID_CALLBACK_ID: u64 = 1;
    const EINVALID_CALLBACK_FID: u64 = 2;

    struct VoteRequest has copy, drop {
        _type_: String,
        proposal_id: u64,
        voter: String,
        option: u64,
        metadata: String
    }

    public entry fun stargate_vote(
        sender: &signer,
        proposal_id: u64,
        voter: String,
        option: u64,
        metadata: String
    ) {
        stargate(
            sender,
            json::marshal(
                &VoteRequest {
                    _type_: string::utf8(b"/cosmos.gov.v1.MsgVote"),
                    proposal_id,
                    voter,
                    option,
                    metadata
                }
            )
        );
    }

    public entry fun stargate(sender: &signer, data: vector<u8>) {
        stargate_internal(signer::address_of(sender), data, disallow_failure())
    }

    /// Stargate message with options
    ///
    /// Options:
    /// - allow_failure()
    /// - disallow_failure()
    /// - allow_failure_with_callback(id: u64, fid: String)
    /// - disallow_failure_with_callback(id: u64, fid: String)
    ///
    /// The callback function should be defined with the following signature:
    /// ```rust
    /// public fun callback(id: u64, success: bool);
    /// public fun callback(sender: &signer, id: u64, success: bool);
    /// ```
    ///
    public fun stargate_with_options(
        sender: &signer, data: vector<u8>, options: Options
    ) {
        stargate_internal(signer::address_of(sender), data, options)
    }

    struct ExecuteRequest has copy, drop {
        _type_: String,
        sender: String,
        module_address: address,
        module_name: String,
        function_name: String,
        type_args: vector<String>,
        args: vector<String> // base64 encoded
    }

    public entry fun move_execute(
        sender: &signer,
        module_address: address,
        module_name: String,
        function_name: String,
        type_args: vector<String>,
        args: vector<vector<u8>>
    ) {
        let args = vector::map(args, |arg| base64::to_string(arg));
        stargate(
            sender,
            json::marshal(
                &ExecuteRequest {
                    _type_: string::utf8(b"/initia.move.v1.MsgExecute"),
                    sender: address::to_sdk(signer::address_of(sender)),
                    module_address,
                    module_name,
                    function_name,
                    type_args,
                    args
                }
            )
        )
    }

    struct ExecuteJSONRequest has copy, drop {
        _type_: String,
        sender: String,
        module_address: address,
        module_name: String,
        function_name: String,
        type_args: vector<String>,
        args: vector<String>
    }

    public entry fun move_execute_with_json(
        sender: &signer,
        module_address: address,
        module_name: String,
        function_name: String,
        type_args: vector<String>,
        args: vector<String>
    ) {
        stargate(
            sender,
            json::marshal(
                &ExecuteJSONRequest {
                    _type_: string::utf8(b"/initia.move.v1.MsgExecuteJSON"),
                    sender: address::to_sdk(signer::address_of(sender)),
                    module_address,
                    module_name,
                    function_name,
                    type_args,
                    args
                }
            )
        )
    }

    struct ScriptRequest has copy, drop {
        _type_: String,
        sender: String,
        code_bytes: String, // base64 encoded
        type_args: vector<String>,
        args: vector<String> // base64 encoded
    }

    public entry fun move_script(
        sender: &signer,
        code_bytes: vector<u8>,
        type_args: vector<String>,
        args: vector<vector<u8>>
    ) {
        let args = vector::map(args, |arg| base64::to_string(arg));
        let code_bytes = base64::to_string(code_bytes);
        stargate(
            sender,
            json::marshal(
                &ScriptRequest {
                    _type_: string::utf8(b"/initia.move.v1.MsgScript"),
                    sender: address::to_sdk(signer::address_of(sender)),
                    code_bytes,
                    type_args,
                    args
                }
            )
        )
    }

    struct ScriptJSONRequest has copy, drop {
        _type_: String,
        sender: String,
        code_bytes: String,
        type_args: vector<String>,
        args: vector<String>
    }

    public entry fun move_script_with_json(
        sender: &signer,
        code_bytes: vector<u8>,
        type_args: vector<String>,
        args: vector<String>
    ) {
        let code_bytes = base64::to_string(code_bytes);
        stargate(
            sender,
            json::marshal(
                &ScriptJSONRequest {
                    _type_: string::utf8(b"/initia.move.v1.MsgScriptJSON"),
                    sender: address::to_sdk(signer::address_of(sender)),
                    code_bytes,
                    type_args,
                    args
                }
            )
        )
    }

    struct DelegateRequest has copy, drop {
        _type_: String,
        delegator_address: String,
        validator_address: String,
        amount: vector<CosmosCoin>
    }

    struct CosmosCoin has copy, drop {
        denom: String,
        amount: u64
    }

    public entry fun delegate(
        delegator: &signer,
        validator: String,
        metadata: Object<Metadata>,
        amount: u64
    ) {
        stargate(
            delegator,
            json::marshal(
                &DelegateRequest {
                    _type_: string::utf8(b"/initia.mstaking.v1.MsgDelegate"),
                    delegator_address: address::to_sdk(signer::address_of(delegator)),
                    validator_address: validator,
                    amount: vector[CosmosCoin { denom: metadata_to_denom(metadata), amount }]
                }
            )
        )
    }

    struct FuncCommunityPoolRequest has copy, drop {
        _type_: String,
        depositor: String,
        amount: vector<CosmosCoin>
    }

    public entry fun fund_community_pool(
        sender: &signer, metadata: Object<Metadata>, amount: u64
    ) {
        stargate(
            sender,
            json::marshal(
                &FuncCommunityPoolRequest {
                    _type_: string::utf8(
                        b"/cosmos.distribution.v1beta1.MsgFundCommunityPool"
                    ),
                    depositor: address::to_sdk(signer::address_of(sender)),
                    amount: vector[CosmosCoin { denom: metadata_to_denom(metadata), amount }]
                }
            )
        )
    }

    struct TransferRequest has copy, drop {
        _type_: String,
        source_port: String,
        source_channel: String,
        sender: String,
        receiver: String,
        token: CosmosCoin,
        timeout_height: TimeoutHeight,
        timeout_timestamp: u64,
        memo: String
    }

    struct TimeoutHeight has copy, drop {
        revision_number: u64,
        revision_height: u64
    }

    /// ICS20 ibc transfer
    /// https://github.com/cosmos/ibc/tree/main/spec/app/ics-020-fungible-token-transfer
    public entry fun transfer(
        sender: &signer,
        receiver: String,
        metadata: Object<Metadata>,
        token_amount: u64,
        source_port: String,
        source_channel: String,
        revision_number: u64,
        revision_height: u64,
        timeout_timestamp: u64,
        memo: String
    ) {
        stargate(
            sender,
            json::marshal(
                &TransferRequest {
                    _type_: string::utf8(b"/ibc.applications.transfer.v1.MsgTransfer"),
                    source_port,
                    source_channel,
                    sender: address::to_sdk(signer::address_of(sender)),
                    receiver,
                    token: CosmosCoin {
                        denom: metadata_to_denom(metadata),
                        amount: token_amount
                    },
                    timeout_height: TimeoutHeight { revision_number, revision_height },
                    timeout_timestamp,
                    memo
                }
            )
        )
    }

    struct NFTTransferRequest has copy, drop {
        _type_: String,
        sender: String,
        receiver: String,
        class_id: String,
        token_ids: vector<String>,
        source_port: String,
        source_channel: String,
        timeout_height: TimeoutHeight,
        timeout_timestamp: u64,
        memo: String
    }

    /// ICS721 ibc nft_transfer
    /// https://github.com/cosmos/ibc/tree/main/spec/app/ics-721-nft-transfer
    public entry fun nft_transfer(
        sender: &signer,
        receiver: String,
        collection: Object<Collection>,
        token_ids: vector<String>,
        source_port: String,
        source_channel: String,
        revision_number: u64,
        revision_height: u64,
        timeout_timestamp: u64,
        memo: String
    ) {
        stargate(
            sender,
            json::marshal(
                &NFTTransferRequest {
                    _type_: string::utf8(b"/ibc.applications.nft_transfer.v1.MsgTransfer"),
                    sender: address::to_sdk(signer::address_of(sender)),
                    receiver,
                    class_id: collection_to_class_id(collection),
                    token_ids,
                    source_port,
                    source_channel,
                    timeout_height: TimeoutHeight { revision_number, revision_height },
                    timeout_timestamp,
                    memo
                }
            )
        )
    }

    struct Fee has copy, drop {
        recv_fee: vector<CosmosCoin>,
        ack_fee: vector<CosmosCoin>,
        timeout_fee: vector<CosmosCoin>
    }

    struct PayFeeRequest has copy, drop {
        _type_: String,
        _signer_: String,
        source_port_id: String,
        source_channel_id: String,
        fee: Fee,
        relayers: vector<String>
    }

    /// ICS29 ibc relayer fee
    /// https://github.com/cosmos/ibc/tree/main/spec/app/ics-029-fee-payment
    public entry fun pay_fee(
        sender: &signer,
        source_port: String,
        source_channel: String,
        recv_fee_metadata: Object<Metadata>,
        recv_fee_amount: u64,
        ack_fee_metadata: Object<Metadata>,
        ack_fee_amount: u64,
        timeout_fee_metadata: Object<Metadata>,
        timeout_fee_amount: u64
    ) {
        stargate(
            sender,
            json::marshal(
                &PayFeeRequest {
                    _type_: string::utf8(b"/ibc.applications.fee.v1.MsgPayPacketFee"),
                    _signer_: address::to_sdk(signer::address_of(sender)),
                    source_port_id: source_port,
                    source_channel_id: source_channel,
                    fee: Fee {
                        recv_fee: vector[
                            CosmosCoin {
                                denom: metadata_to_denom(recv_fee_metadata),
                                amount: recv_fee_amount
                            }
                        ],
                        ack_fee: vector[
                            CosmosCoin {
                                denom: metadata_to_denom(ack_fee_metadata),
                                amount: ack_fee_amount
                            }
                        ],
                        timeout_fee: vector[
                            CosmosCoin {
                                denom: metadata_to_denom(timeout_fee_metadata),
                                amount: timeout_fee_amount
                            }
                        ]
                    },
                    relayers: vector::empty()
                }
            )
        )
    }

    //
    // Native Functions
    //

    native fun stargate_internal(
        sender: address, data: vector<u8>, option: Options
    );

    #[test_only]
    native public fun requested_messages(): (vector<String>, vector<Options>);

    #[test_only]
    public fun was_message_requested(msg: &String): bool {
        was_message_requested_with_options(msg, &disallow_failure())
    }

    #[test_only]
    public fun was_message_requested_with_options(
        msg: &String, opt: &Options
    ): bool {
        use std::vector;
        let (messages, opts) = requested_messages();
        let (found, idx) = vector::index_of(&messages, msg);
        found && vector::borrow(&opts, idx) == opt
    }

    // ================================================== Options =================================================

    /// Options for stargate message
    struct Options has copy, drop {
        allow_failure: bool,

        /// callback_id is the unique identifier for this message execution.
        callback_id: u64,
        /// function identifier which will be called after the message execution.
        /// The function should be defined with the following signature:
        /// ```rust
        /// public fun callback(id: u64, success: bool);
        /// public fun callback(sender: &signer, id: u64, success: bool);
        /// ```
        ///
        /// Ex) 0xaddr::test_module::callback
        /// where callback is the function name defined in the test_module of the 0xaddr address.
        callback_fid: vector<u8>
    }

    public fun allow_failure(): Options {
        Options {
            allow_failure: true,
            callback_id: 0,
            callback_fid: vector::empty()
        }
    }

    public fun disallow_failure(): Options {
        Options {
            allow_failure: false,
            callback_id: 0,
            callback_fid: vector::empty()
        }
    }

    /// Ex) fid: 0xaddr::test_module::callback
    /// where callback is the function name defined in the test_module of the 0xaddr address.
    public fun allow_failure_with_callback(id: u64, fid: String): Options {
        assert!(id > 0, error::invalid_argument(EINVALID_CALLBACK_ID));
        assert!(
            !string::is_empty(&fid), error::invalid_argument(EINVALID_CALLBACK_FID)
        );

        Options {
            allow_failure: true,
            callback_id: id,
            callback_fid: *string::bytes(&fid)
        }
    }

    /// Ex) fid: 0xaddr::test_module::callback
    /// where callback is the function name defined in the test_module of the 0xaddr address.
    public fun disallow_failure_with_callback(id: u64, fid: String): Options {
        assert!(id > 0, error::invalid_argument(EINVALID_CALLBACK_ID));
        assert!(
            !string::is_empty(&fid), error::invalid_argument(EINVALID_CALLBACK_FID)
        );

        Options {
            allow_failure: false,
            callback_id: id,
            callback_fid: *string::bytes(&fid)
        }
    }

    /// Unpack options for external use
    public fun unpack_options(opt: Options): (bool, u64, String) {
        (opt.allow_failure, opt.callback_id, string::utf8(opt.callback_fid))
    }

    //=========================================== Tests ===========================================

    #[test(sender = @0xcafe)]
    public fun test_stargate_vote(sender: &signer) {
        use std::string::utf8;

        let voter = utf8(b"voter");
        let proposal_id = 1;
        let option = 1;
        let metadata = utf8(b"metadata");
        stargate_vote(sender, proposal_id, voter, option, metadata);

        let msg =
            json::marshal_to_string(
                &VoteRequest {
                    _type_: utf8(b"/cosmos.gov.v1.MsgVote"),
                    proposal_id,
                    voter: voter,
                    option,
                    metadata: metadata
                }
            );

        assert!(was_message_requested(&msg), 1);
    }

    #[test(sender = @0xcafe)]
    public fun test_stargate_with_options(sender: &signer) {
        use std::string::{utf8, bytes};

        let voter = utf8(b"voter");
        let proposal_id = 1;
        let option = 1;
        let metadata = utf8(b"metadata");
        let msg =
            json::marshal_to_string(
                &VoteRequest {
                    _type_: utf8(b"/cosmos.gov.v1.MsgVote"),
                    proposal_id,
                    voter: voter,
                    option,
                    metadata: metadata
                }
            );

        stargate_with_options(
            sender,
            *bytes(&msg),
            allow_failure_with_callback(1, utf8(b"0x1::test::test_fn"))
        );

        assert!(
            was_message_requested_with_options(
                &msg, &allow_failure_with_callback(1, utf8(b"0x1::test::test_fn"))
            ),
            1
        );
    }
}
