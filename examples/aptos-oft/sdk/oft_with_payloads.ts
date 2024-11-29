import { EndpointId } from '@layerzerolabs/lz-definitions-v3'
import { Account, Aptos, Ed25519PrivateKey, InputEntryFunctionData, SimpleTransaction } from '@aptos-labs/ts-sdk'
import { encodeAddress } from './utils'

export class OFT {
    private aptos: Aptos
    private account_address: string
    private private_key: string
    private signer_account: Account
    private oft_address: string

    constructor(aptos: Aptos, oft_address: string, account_address: string, private_key: string) {
        this.aptos = aptos
        this.oft_address = oft_address
        this.account_address = account_address
        this.private_key = private_key
        this.signer_account = Account.fromPrivateKey({
            privateKey: new Ed25519PrivateKey(private_key),
            address: account_address,
        })
    }

    setPeerPayload(eid: number, peer: Uint8Array): InputEntryFunctionData {
        return {
            function: `${this.oft_address}::oapp_core::set_peer`,
            functionArguments: [eid, peer],
            typeArguments: ['u32', 'vector<u8>'],
        } satisfies InputEntryFunctionData
    }

    setDelegatePayload(delegate: string): InputEntryFunctionData {
        return {
            function: `${this.oft_address}::oapp_core::set_delegate`,
            functionArguments: [delegate],
            typeArguments: ['address'],
        } satisfies InputEntryFunctionData
    }

    setEnforcedOptionsPayload(eid: number, msgType: number, enforcedOptions: Uint8Array): InputEntryFunctionData {
        return {
            function: `${this.oft_address}::oapp_core::set_enforced_options`,
            functionArguments: [eid, msgType, enforcedOptions],
            typeArguments: ['u32', 'u16', 'vector<u8>'],
        } satisfies InputEntryFunctionData
    }

    async getDelegate() {
        const result = await this.aptos.view({
            payload: {
                function: `${this.oft_address}::oapp_core::get_delegate`,
                functionArguments: [],
            },
        })

        return result
    }

    async getAdmin() {
        const result = await this.aptos.view({
            payload: {
                function: `${this.oft_address}::oapp_core::get_admin`,
                functionArguments: [],
            },
        })

        return result
    }

    async getPeer(eid: EndpointId) {
        const result = await this.aptos.view({
            payload: {
                function: `${this.oft_address}::oapp_core::get_peer`,
                functionArguments: [eid],
            },
        })

        return result
    }

    async getEnforcedOptions(eid: number, msgType: number) {
        const result = await this.aptos.view({
            payload: {
                function: `${this.oft_address}::oapp_core::get_enforced_options`,
                functionArguments: [eid, msgType],
            },
        })

        return result
    }

    setSendLibraryPayload(remoteEid: number, msgLibAddress: string): InputEntryFunctionData {
        return {
            function: `${this.oft_address}::oapp_core::set_send_library`,
            functionArguments: [remoteEid, msgLibAddress],
            typeArguments: ['u32', 'address'],
        } satisfies InputEntryFunctionData
    }

    setReceiveLibraryPayload(remoteEid: number, msgLibAddress: string, gracePeriod: bigint): InputEntryFunctionData {
        return {
            function: `${this.oft_address}::oapp_core::set_receive_library`,
            functionArguments: [remoteEid, msgLibAddress, gracePeriod],
            typeArguments: ['u32', 'address', 'u64'],
        } satisfies InputEntryFunctionData
    }

    setReceiveLibraryTimeoutPayload(remoteEid: number, msgLibAddress: string, expiry: bigint): InputEntryFunctionData {
        return {
            function: `${this.oft_address}::oapp_core::set_receive_library_timeout`,
            functionArguments: [remoteEid, msgLibAddress, expiry],
            typeArguments: ['u32', 'address', 'u64'],
        } satisfies InputEntryFunctionData
    }

    setConfigPayload(msgLibAddress: string, configType: number, config: Uint8Array): InputEntryFunctionData {
        return {
            function: `${this.oft_address}::oapp_core::set_config`,
            functionArguments: [msgLibAddress, configType, config],
            typeArguments: ['address', 'u32', 'vector<u8>'],
        } satisfies InputEntryFunctionData
    }

    async signSubmitAndWaitForTransaction(transaction: SimpleTransaction, signer_account: Account) {
        const signedTransaction = await this.aptos.signAndSubmitTransaction({
            signer: signer_account,
            transaction: transaction,
        })

        const executedTransaction = await this.aptos.waitForTransaction({ transactionHash: signedTransaction.hash })
        console.log('Transaction executed.')

        return executedTransaction
    }

    // TODO: use existing batch send, however seperate batches by steps,
    // so first send all set peer txs, then all set delegate txs, etc
}
