import { EndpointId } from '@layerzerolabs/lz-definitions-v3'
import { Account, Aptos, Ed25519PrivateKey, SimpleTransaction } from '@aptos-labs/ts-sdk'
import { hexToAptosBytesAddress } from './utils'

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

    async setPeerPayload(eid: EndpointId, peerAddress: string) {
        const peerAddressAsBytes = hexToAptosBytesAddress(peerAddress)
        return {
            function: `${this.oft_address}::oapp_core::set_peer`,
            functionArguments: [eid, peerAddressAsBytes],
        }
    }

    async setDelegatePayload(delegateAddress: string) {
        return {
            function: `${this.oft_address}::oapp_core::set_delegate`,
            functionArguments: [delegateAddress],
        }
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

        return result[0]
    }

    async setEnforcedOptionsPayload(eid: number, msgType: number, enforcedOptions: Uint8Array) {
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

    async setSendLibraryPayload(remoteEid: number, msglibAddress: string) {
        return {
            function: `${this.oft_address}::oapp_core::set_send_library`,
            functionArguments: [remoteEid, msglibAddress],
        }
    }

    async setReceiveLibraryPayload(remoteEid: number, msglibAddress: string, gracePeriod: number) {
        return {
            function: `${this.oft_address}::oapp_core::set_receive_library`,
            functionArguments: [remoteEid, msglibAddress, gracePeriod],
        }
    }

    async setReceiveLibraryTimeoutPayload(remoteEid: number, msglibAddress: string, expiry: number) {
        return {
            function: `${this.oft_address}::oapp_core::set_receive_library_timeout`,
            functionArguments: [remoteEid, msglibAddress, expiry],
        }
    }

    async setConfigPayload(msgLibAddress: string, configType: number, config: Uint8Array) {
        return {
            function: `${this.oft_address}::oapp_core::set_config`,
            functionArguments: [msgLibAddress, configType, config],
        }
    }

    async signSubmitAndWaitForTransaction(transaction: SimpleTransaction) {
        const signedTransaction = await this.aptos.signAndSubmitTransaction({
            signer: this.signer_account,
            transaction: transaction,
        })

        const executedTransaction = await this.aptos.waitForTransaction({ transactionHash: signedTransaction.hash })
        console.log('Transaction executed.')

        return executedTransaction
    }
}
