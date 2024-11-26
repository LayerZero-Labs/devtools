import { EndpointId } from '@layerzerolabs/lz-definitions'
import { Account, Aptos, Ed25519PrivateKey, SimpleTransaction } from '@aptos-labs/ts-sdk'

function encodeAddress(address: string | null | undefined): Uint8Array {
    const bytes = address ? Buffer.from(address.replace('0x', ''), 'hex') : new Uint8Array(0)
    const bytes32 = new Uint8Array(32)
    bytes32.set(bytes, 32 - bytes.length)
    return bytes32
}

export class OFT {
    private aptos: Aptos
    private account_address: string
    private private_key: string
    private signer_account: Account

    constructor(aptos: Aptos, account_address: string, private_key: string) {
        this.aptos = aptos
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
                function: `${OFT_ADDRESS}::oapp_core::set_peer`,
                functionArguments: [eid, peerAddressAsBytes],
            },
        })

        return await this.signSubmitAndWaitForTransaction(transaction, this.signer_account)
    }

    async setDelegate(delegateAddress: string) {
        const transaction = await this.aptos.transaction.build.simple({
            sender: this.account_address,
            data: {
                function: `${this.account_address}::oapp_core::set_delegate`,
                functionArguments: [delegateAddress],
            },
        })

        return await this.signSubmitAndWaitForTransaction(transaction, this.signer_account)
    }

    async getDelegate() {
        const transaction = await this.aptos.view({
            payload: {
                // The Move entry-function
                function: `${this.account_address}::oapp_core::get_delegate`,
                functionArguments: [],
            },
        })

        return transaction
    }

    async getAdmin() {
        return await this.aptos.view({
            payload: {
                function: `${this.account_address}::oapp_core::get_admin`,
                functionArguments: [],
            },
        })
    }

    async signSubmitAndWaitForTransaction(transaction: SimpleTransaction, signer_account: Account) {
        const signedTransaction = await this.aptos.signAndSubmitTransaction({
            signer: signer_account,
            transaction: transaction,
        })

        const executedTransaction = await this.aptos.waitForTransaction({ transactionHash: signedTransaction.hash })
        console.log('executedTransaction:')
        console.dir(executedTransaction, { depth: null })

        return executedTransaction
    }
}
