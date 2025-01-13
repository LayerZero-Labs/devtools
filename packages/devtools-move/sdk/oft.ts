import {
    Account,
    Aptos,
    Ed25519PrivateKey,
    InputGenerateTransactionPayloadData,
    PrivateKey,
    PrivateKeyVariants,
    SimpleTransaction,
} from '@aptos-labs/ts-sdk'

import { EndpointId } from '@layerzerolabs/lz-definitions'

import { hexAddrToAptosBytesAddr } from './utils'

export enum OFTType {
    OFT_FA = 'oft_fa',
    OFT_ADAPTER_FA = 'oft_adapter_fa',
    OFT_COIN = 'oft_coin',
    OFT_ADAPTER_COIN = 'oft_adapter_coin',
}

export class OFT {
    public moveVMConnection: Aptos
    private private_key: string
    private signer_account: Account
    public oft_address: string

    constructor(moveVMConnection: Aptos, oft_address: string, account_address: string, private_key: string) {
        this.moveVMConnection = moveVMConnection
        this.oft_address = oft_address
        this.private_key = PrivateKey.formatPrivateKey(private_key, PrivateKeyVariants.Ed25519)
        this.signer_account = Account.fromPrivateKey({
            privateKey: new Ed25519PrivateKey(this.private_key),
            address: account_address,
        })
    }

    initializeOFTFAPayload(
        token_name: string,
        symbol: string,
        icon_uri: string,
        project_uri: string,
        shared_decimals: number,
        local_decimals: number
    ): InputGenerateTransactionPayloadData {
        const encoder = new TextEncoder()
        return {
            function: `${this.oft_address}::oft_fa::initialize`,
            functionArguments: [
                encoder.encode(token_name),
                encoder.encode(symbol),
                encoder.encode(icon_uri),
                encoder.encode(project_uri),
                shared_decimals,
                local_decimals,
            ],
        }
    }

    initializeAdapterFAPayload(
        tokenMetadataAddress: string,
        sharedDecimals: number
    ): InputGenerateTransactionPayloadData {
        return {
            function: `${this.oft_address}::oft_adapter_fa::initialize`,
            functionArguments: [tokenMetadataAddress, sharedDecimals],
        }
    }

    createSetRateLimitTx(
        eid: EndpointId,
        limit: number | bigint,
        window_seconds: number | bigint,
        oftType: OFTType
    ): InputGenerateTransactionPayloadData {
        return {
            function: `${this.oft_address}::${oftType}::set_rate_limit`,
            functionArguments: [eid, limit, window_seconds],
        }
    }

    createUnsetRateLimitTx(eid: EndpointId, oftType: OFTType): InputGenerateTransactionPayloadData {
        return {
            function: `${this.oft_address}::${oftType}::unset_rate_limit`,
            functionArguments: [eid],
        }
    }

    // returns (limit, window_seconds)
    async getRateLimitConfig(eid: EndpointId, oftType: OFTType): Promise<[bigint, bigint]> {
        const result = await this.moveVMConnection.view({
            payload: {
                function: `${this.oft_address}::${oftType}::rate_limit_config`,
                functionArguments: [eid],
            },
        })
        const limit = typeof result[0] === 'string' ? BigInt(result[0]) : (result[0] as bigint)
        const window = typeof result[1] === 'string' ? BigInt(result[1]) : (result[1] as bigint)
        return [limit, window]
    }

    createSetFeeBpsTx(fee_bps: number | bigint, oftType: OFTType): InputGenerateTransactionPayloadData {
        return {
            function: `${this.oft_address}::${oftType}::set_fee_bps`,
            functionArguments: [fee_bps],
        }
    }

    async getFeeBps(oftType: OFTType): Promise<bigint> {
        const result = await this.moveVMConnection.view({
            payload: {
                function: `${this.oft_address}::${oftType}::fee_bps`,
                functionArguments: [],
            },
        })
        const feeBps = result[0]
        return typeof feeBps === 'string' ? BigInt(feeBps) : (feeBps as bigint)
    }

    mintPayload(recipient: string, amount: number | bigint): InputGenerateTransactionPayloadData {
        return {
            function: `${this.oft_address}::oft_fa::mint`,
            functionArguments: [recipient, amount],
        }
    }

    async getBalance(account: string): Promise<number> {
        const result = await this.moveVMConnection.view({
            payload: {
                function: `${this.oft_address}::oft::balance`,
                functionArguments: [account],
            },
        })

        return result[0] as number
    }

    async quoteSend(
        userSender: string,
        dst_eid: number,
        to: Uint8Array,
        amount_ld: number | bigint,
        min_amount_ld: number | bigint,
        extra_options: Uint8Array,
        compose_message: Uint8Array,
        oft_cmd: Uint8Array,
        pay_in_zro: boolean
    ): Promise<[number, number]> {
        const result = await this.moveVMConnection.view({
            payload: {
                function: `${this.oft_address}::oft::quote_send`,
                functionArguments: [
                    userSender,
                    dst_eid,
                    to,
                    amount_ld,
                    min_amount_ld,
                    extra_options,
                    compose_message,
                    oft_cmd,
                    pay_in_zro,
                ],
            },
        })
        return [result[0] as number, result[1] as number]
    }

    // Calls send withdraw on the oft
    sendPayload(
        dst_eid: number,
        to: Uint8Array,
        amount_ld: number | bigint,
        min_amount_ld: number | bigint,
        extra_options: Uint8Array,
        compose_message: Uint8Array,
        oft_cmd: Uint8Array,
        native_fee: number | bigint,
        zro_fee: number | bigint
    ): InputGenerateTransactionPayloadData {
        return {
            function: `${this.oft_address}::oft::send_withdraw`,
            functionArguments: [
                dst_eid,
                to,
                amount_ld,
                min_amount_ld,
                extra_options,
                compose_message,
                oft_cmd,
                native_fee,
                zro_fee,
            ],
        }
    }

    setPeerPayload(eid: EndpointId, peerAddress: string): InputGenerateTransactionPayloadData {
        const peerAddressAsBytes = hexAddrToAptosBytesAddr(peerAddress)
        return {
            function: `${this.oft_address}::oapp_core::set_peer`,
            functionArguments: [eid, peerAddressAsBytes],
        }
    }

    setDelegatePayload(delegateAddress: string): InputGenerateTransactionPayloadData {
        return {
            function: `${this.oft_address}::oapp_core::set_delegate`,
            functionArguments: [delegateAddress],
        }
    }

    async getDelegate(): Promise<string> {
        const result = await this.moveVMConnection.view({
            payload: {
                function: `${this.oft_address}::oapp_core::get_delegate`,
                functionArguments: [],
            },
        })

        return result[0] as string
    }

    async getAdmin(): Promise<string> {
        const result = await this.moveVMConnection.view({
            payload: {
                function: `${this.oft_address}::oapp_core::get_admin`,
                functionArguments: [],
            },
        })

        return result[0] as string
    }

    transferAdminPayload(adminAddress: string): InputGenerateTransactionPayloadData {
        return {
            function: `${this.oft_address}::oapp_core::transfer_admin`,
            functionArguments: [adminAddress],
        }
    }

    transferObjectPayload(object_address: string, new_owner_address: string): InputGenerateTransactionPayloadData {
        return {
            function: '0x1::object::transfer',
            typeArguments: [`0x1::object::ObjectCore`],
            functionArguments: [object_address, new_owner_address],
        }
    }

    renounceAdminPayload(): InputGenerateTransactionPayloadData {
        return {
            function: `${this.oft_address}::oapp_core::renounce_admin`,
            functionArguments: [],
        }
    }

    async getPeer(eid: EndpointId): Promise<string> {
        const result = await this.moveVMConnection.view({
            payload: {
                function: `${this.oft_address}::oapp_core::get_peer`,
                functionArguments: [eid],
            },
        })

        return result[0] as string
    }

    async hasPeer(eid: EndpointId): Promise<boolean> {
        const result = await this.moveVMConnection.view({
            payload: {
                function: `${this.oft_address}::oapp_core::has_peer`,
                functionArguments: [eid],
            },
        })

        return result[0] as boolean
    }

    setEnforcedOptionsPayload(
        eid: number,
        msgType: number,
        enforcedOptions: Uint8Array
    ): InputGenerateTransactionPayloadData {
        return {
            function: `${this.oft_address}::oapp_core::set_enforced_options`,
            functionArguments: [eid, msgType, enforcedOptions],
        }
    }

    async getEnforcedOptions(eid: number, msgType: number): Promise<string> {
        const result = await this.moveVMConnection.view({
            payload: {
                function: `${this.oft_address}::oapp_core::get_enforced_options`,
                functionArguments: [eid, msgType],
            },
        })

        return result[0] as string
    }

    setSendLibraryPayload(remoteEid: number, msglibAddress: string): InputGenerateTransactionPayloadData {
        return {
            function: `${this.oft_address}::oapp_core::set_send_library`,
            functionArguments: [remoteEid, msglibAddress],
        }
    }

    setReceiveLibraryPayload(
        remoteEid: number,
        msglibAddress: string,
        gracePeriod: number
    ): InputGenerateTransactionPayloadData {
        return {
            function: `${this.oft_address}::oapp_core::set_receive_library`,
            functionArguments: [remoteEid, msglibAddress, gracePeriod],
        }
    }

    setReceiveLibraryTimeoutPayload(
        remoteEid: number,
        msglibAddress: string,
        expiry: number
    ): InputGenerateTransactionPayloadData {
        return {
            function: `${this.oft_address}::oapp_core::set_receive_library_timeout`,
            functionArguments: [remoteEid, msglibAddress, expiry],
        }
    }

    setConfigPayload(
        msgLibAddress: string,
        eid: number,
        configType: number,
        config: Uint8Array
    ): InputGenerateTransactionPayloadData {
        return {
            function: `${this.oft_address}::oapp_core::set_config`,
            functionArguments: [msgLibAddress, eid, configType, config],
        }
    }

    irrevocablyDisableBlocklistPayload(oftType: OFTType): InputGenerateTransactionPayloadData {
        return {
            function: `${this.oft_address}::${oftType}::irrevocably_disable_blocklist`,
            functionArguments: [],
        }
    }

    permanentlyDisableFungibleStoreFreezingPayload(): InputGenerateTransactionPayloadData {
        return {
            function: `${this.oft_address}::oft_fa::permanently_disable_fungible_store_freezing`,
            functionArguments: [],
        }
    }

    async signSubmitAndWaitForTx(transaction: SimpleTransaction) {
        const signedTransaction = await this.moveVMConnection.signAndSubmitTransaction({
            signer: this.signer_account,
            transaction: transaction,
        })

        const executedTransaction = await this.moveVMConnection.waitForTransaction({
            transactionHash: signedTransaction.hash,
        })
        console.log('Transaction executed.')

        return executedTransaction
    }
}
