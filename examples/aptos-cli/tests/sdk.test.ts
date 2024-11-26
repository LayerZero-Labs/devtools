import { EndpointId, SandboxV2EndpointId } from '@layerzerolabs/lz-definitions'
import { Account, Aptos, AptosConfig, Ed25519PrivateKey, Network } from '@aptos-labs/ts-sdk'
const account_address = '0x3d24005f22a2913a9e228547177a01a817fcd5bbaa5290b07fe4826f3f31be4a'
const OFT_ADDRESS = '0x8401fa82eea1096b32fd39207889152f947d78de1b65976109493584636622a8'
const BSC_OFT_ADAPTER_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
const public_key = '0x8cea84a194ce8032cdd6e12dd87735b4f03a5ba428f3c4265813c7a39ec984d8'
const private_key = '0xc4a953452fb957eddc47e309b5679c020e09c4d3c872bda43569cbff6671dca6'
const aptosEndpointId = SandboxV2EndpointId.APTOS_V2_SANDBOX

function encodeAddress(address: string | null | undefined): Uint8Array {
    const bytes = address ? Buffer.from(address.replace('0x', ''), 'hex') : new Uint8Array(0)
    const bytes32 = new Uint8Array(32)
    bytes32.set(bytes, 32 - bytes.length)
    return bytes32
}

describe('ua-devtools-initia', () => {
    let aptos: Aptos

    beforeEach(() => {
        const config = new AptosConfig({
            network: Network.CUSTOM,
            fullnode: 'http://127.0.0.1:8080/v1',
            indexer: 'http://127.0.0.1:8090/v1',
            faucet: 'http://127.0.0.1:8081',
        })
        aptos = new Aptos(config)
    })

    it('Should get delegate', async () => {
        aptos.fundAccount({ accountAddress: account_address, amount: 100 })
    })

    // deploy or register the object module, then everything is the same, look inot th eaptos sdk for objects
    // access the signer through the object with might need be done through scripts

    it('Should set peer', async () => {
        const privateKey = new Ed25519PrivateKey(private_key)
        const signer_account = Account.fromPrivateKey({ privateKey: privateKey, address: account_address })
        console.log('signer_account~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
        console.dir(signer_account, { depth: null })
        console.log('privateKey:', privateKey)
        const accountInfo = await aptos.getAccountInfo({ accountAddress: account_address })
        console.log('accountInfo:', accountInfo)

        const peerAddressAsBytes = encodeAddress(BSC_OFT_ADAPTER_ADDRESS)
        const transaction = await aptos.transaction.build.simple({
            sender: account_address,
            data: {
                // The Move entry-function
                function: `${OFT_ADDRESS}::oapp_core::set_peer`,
                functionArguments: [EndpointId.BSC_TESTNET, peerAddressAsBytes],
            },
        })

        const signed = await aptos.transaction.sign({
            signer: signer_account,
            transaction: transaction,
        })
        console.log('signed:')
        console.dir(signed, { depth: null })
        const committedTransaction = await aptos.transaction.submit.simple({
            transaction: transaction,
            senderAuthenticator: signed,
        })

        const executedTransaction = await aptos.waitForTransaction({ transactionHash: committedTransaction.hash })
        console.log('executedTransaction:')
        console.dir(executedTransaction, { depth: null })
    })

    it('Should set Delegate', async () => {
        const privateKey = new Ed25519PrivateKey(private_key)
        const signer_account = Account.fromPrivateKey({ privateKey: privateKey, address: account_address })
        console.log('signer_account~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
        console.dir(signer_account, { depth: null })
        const signer_account_address = signer_account.accountAddress.toString()
        console.log('signer_account_address:', signer_account_address)
        console.log('privateKey:', privateKey)
        const accountInfo = await aptos.getAccountInfo({ accountAddress: account_address })
        console.log('accountInfo:', accountInfo)

        const transaction = await aptos.transaction.build.simple({
            sender: account_address,
            data: {
                // The Move entry-function
                function: `${OFT_ADDRESS}::oapp_core::set_delegate`,
                functionArguments: [account_address],
            },
        })

        const signedTransaction = await aptos.signAndSubmitTransaction({
            signer: signer_account,
            transaction: transaction,
        })

        const executedTransaction = await aptos.waitForTransaction({ transactionHash: signedTransaction.hash })
        console.log('executedTransaction:')
        console.dir(executedTransaction, { depth: null })
    })

    it('Should get delegate', async () => {
        const privateKey = new Ed25519PrivateKey(private_key)
        const signer_account = Account.fromPrivateKey({ privateKey: privateKey, address: account_address })
        console.log('signer_account~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
        console.dir(signer_account, { depth: null })
        // console.log('privateKey:', privateKey.)
        // const accountInfo = await aptos.getAccountInfo({ accountAddress: public_key })
        // console.log('accountInfo:', accountInfo)
        await aptos.fundAccount({ accountAddress: account_address, amount: 1000000000000000 })

        const transaction = await aptos.view({
            payload: {
                // The Move entry-function
                function: `${OFT_ADDRESS}::oapp_core::get_delegate`,
                functionArguments: [],
            },
        })

        console.log('transaction:')
        console.dir(transaction, { depth: null })

        const transactionToGetAdmin = await aptos.view({
            payload: {
                function: `${OFT_ADDRESS}::oapp_core::get_admin`,
                functionArguments: [],
            },
        })
        console.log('transactionToGetAdmin:')
        console.dir(transactionToGetAdmin, { depth: null })
    })

    it.only('Should get deployed objects', async () => {
        const objects = await aptos.getAccountOwnedObjects({ accountAddress: account_address })
        console.log('objects:')
        console.dir(objects, { depth: null })
    })
})
