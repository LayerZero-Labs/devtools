import { EndpointId } from '@layerzerolabs/lz-definitions'
import { Account, Aptos, Ed25519PrivateKey, SimpleTransaction } from '@aptos-labs/ts-sdk'
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

    async setPeer(eid: EndpointId, peerAddress: string) {
        const peerAddressAsBytes = encodeAddress(peerAddress)
        const transaction = await this.aptos.transaction.build.simple({
            sender: this.account_address,
            data: {
                function: `${this.oft_address}::oapp_core::set_peer`,
                functionArguments: [eid, peerAddressAsBytes],
            },
        })

        return await this.signSubmitAndWaitForTransaction(transaction, this.signer_account)
    }

    async setDelegate(delegateAddress: string) {
        console.log(`setting delegate to ${delegateAddress}`)
        const transaction = await this.aptos.transaction.build.simple({
            sender: this.account_address,
            data: {
                function: `${this.oft_address}::oapp_core::set_delegate`,
                functionArguments: [delegateAddress],
            },
        })

        const result = await this.signSubmitAndWaitForTransaction(transaction, this.signer_account)
        console.log(`set delegate result: ${result}`)
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
        return await this.aptos.view({
            payload: {
                function: `${this.oft_address}::oapp_core::get_peer`,
                functionArguments: [eid],
            },
        })
    }

    async setEnforcedOptions(eid: number, msgType: number, enforcedOptions: Uint8Array) {
        const transaction = await this.aptos.transaction.build.simple({
            sender: this.account_address,
            data: {
                function: `${this.oft_address}::oapp_core::set_enforced_options`,
                functionArguments: [eid, msgType, enforcedOptions],
            },
        })

        await this.signSubmitAndWaitForTransaction(transaction, this.signer_account)
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

    async setSendLibrary(remoteEid: number, msglibAddress: string) {
        const transaction = await this.aptos.transaction.build.simple({
            sender: this.account_address,
            data: {
                function: `${this.oft_address}::oapp_core::set_send_library`,
                functionArguments: [remoteEid, msglibAddress],
            },
        })

        const result = await this.signSubmitAndWaitForTransaction(transaction, this.signer_account)
        console.log(`set send library result: ${result}`)
        return result
    }

    async setReceiveLibrary(remoteEid: number, msglibAddress: string, gracePeriod: number) {
        const transaction = await this.aptos.transaction.build.simple({
            sender: this.account_address,
            data: {
                function: `${this.oft_address}::oapp_core::set_receive_library`,
                functionArguments: [remoteEid, msglibAddress, gracePeriod],
            },
        })

        const result = await this.signSubmitAndWaitForTransaction(transaction, this.signer_account)
        console.log(`set receive library result: ${result}`)
        return result
    }

    async setReceiveLibraryTimeout(remoteEid: number, msglibAddress: string, expiry: number) {
        const transaction = await this.aptos.transaction.build.simple({
            sender: this.account_address,
            data: {
                function: `${this.oft_address}::oapp_core::set_receive_library_timeout`,
                functionArguments: [remoteEid, msglibAddress, expiry],
            },
        })

        const result = await this.signSubmitAndWaitForTransaction(transaction, this.signer_account)
        console.log(`set receive library timeout result: ${result}`)
        return result
    }

    // async setConfig(configType: number, config: Uint8Array) {
    //     const transaction = await this.aptos.transaction.build.simple({
    //         sender: this.account_address,
    //         data: {},
    //     })
    // }

    async signSubmitAndWaitForTransaction(transaction: SimpleTransaction, signer_account: Account) {
        const signedTransaction = await this.aptos.signAndSubmitTransaction({
            signer: signer_account,
            transaction: transaction,
        })

        const executedTransaction = await this.aptos.waitForTransaction({ transactionHash: signedTransaction.hash })
        console.log('Transaction executed.')

        return executedTransaction
    }
}
