import {
    Account,
    Aptos,
    Ed25519PrivateKey,
    InputGenerateTransactionPayloadData,
    PrivateKey,
    PrivateKeyVariants,
    SimpleTransaction,
} from '@aptos-labs/ts-sdk'

import { EndpointId } from '@layerzerolabs/lz-definitions-v3'

import { hexAddrToAptosBytesAddr } from './utils'

export class OFT {
    public aptos: Aptos
    private private_key: string
    private signer_account: Account
    public oft_address: string

    constructor(aptos: Aptos, oft_address: string, account_address: string, private_key: string) {
        this.aptos = aptos
        this.oft_address = oft_address
        this.private_key = PrivateKey.formatPrivateKey(private_key, PrivateKeyVariants.Ed25519)
        this.signer_account = Account.fromPrivateKey({
            privateKey: new Ed25519PrivateKey(this.private_key),
            address: account_address,
        })
    }

    initializePayload(
        token_name: string,
        symbol: string,
        icon_uri: string,
        project_uri: string,
        shared_decimals: number,
        local_decimals: number
    ): InputGenerateTransactionPayloadData {
        const encoder = new TextEncoder()
        return {
            function: `${this.oft_address}::oft_impl::initialize`,
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

    mintPayload(recipient: string, amount: number | bigint): InputGenerateTransactionPayloadData {
        return {
            function: `${this.oft_address}::oft_impl::mint`,
            functionArguments: [recipient, amount],
        }
    }

    async getBalance(account: string): Promise<number> {
        const result = await this.aptos.view({
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
        const result = await this.aptos.view({
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

    // Calls send_withdraw from the oft fungible asset module (oft.move)
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
        const result = await this.aptos.view({
            payload: {
                function: `${this.oft_address}::oapp_core::get_delegate`,
                functionArguments: [],
            },
        })

        return result[0] as string
    }

    async getAdmin(): Promise<string> {
        const result = await this.aptos.view({
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

    renounceAdminPayload(): InputGenerateTransactionPayloadData {
        return {
            function: `${this.oft_address}::oapp_core::renounce_admin`,
            functionArguments: [],
        }
    }

    async getPeer(eid: EndpointId): Promise<string> {
        const result = await this.aptos.view({
            payload: {
                function: `${this.oft_address}::oapp_core::get_peer`,
                functionArguments: [eid],
            },
        })

        return result[0] as string
    }

    async hasPeer(eid: EndpointId): Promise<boolean> {
        const result = await this.aptos.view({
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
        const result = await this.aptos.view({
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
        configType: number,
        config: Uint8Array
    ): InputGenerateTransactionPayloadData {
        return {
            function: `${this.oft_address}::oapp_core::set_config`,
            functionArguments: [msgLibAddress, configType, config],
        }
    }

    async signSubmitAndWaitForTx(transaction: SimpleTransaction) {
        const signedTransaction = await this.aptos.signAndSubmitTransaction({
            signer: this.signer_account,
            transaction: transaction,
        })

        const executedTransaction = await this.aptos.waitForTransaction({ transactionHash: signedTransaction.hash })
        console.log('Transaction executed.')

        return executedTransaction
    }
}
