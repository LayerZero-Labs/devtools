import { OFT } from '../src/oft/sdk'
import { EndpointId, Stage, SandboxV2EndpointId } from '@layerzerolabs/lz-definitions'
import { Account, Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { SDK as AptosSDK } from '@layerzerolabs/lz-aptos-sdk-v2'
import { deserializeTransactionPayload } from '../../devtools-aptos/src/signer/serde'
const OFT_ADDRESS = '0xfc07ed99874d8dab5174934e2e5ecafd5bc4fad2253cd4f7a7b23d5268a9b3e3'
const BSC_OFT_ADAPTER_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
const aptosEndpointId = SandboxV2EndpointId.APTOS_V2_SANDBOX

describe('ua-devtools-initia', () => {
    let oft: OFT
    let aptos: Aptos

    beforeEach(() => {
        const config = new AptosConfig({
            network: Network.CUSTOM,
            fullnode: 'http://127.0.0.1:8080/v1',
            indexer: 'http://127.0.0.1:8090/v1',
        })
        aptos = new Aptos(config)

        const sdk = new AptosSDK({
            provider: aptos,
            stage: Stage.SANDBOX,
            accounts: {
                oft: OFT_ADDRESS,
            },
        })
        oft = new OFT(sdk, { eid: aptosEndpointId, address: OFT_ADDRESS })
    })

    it('Should set peer', async () => {
        console.log('oft.isInitialized:', await oft.isInitialized())
        console.log('oft.oft.getAdmin:', await oft.oft.getAdmin())
        console.log('oft.oft.getEnforcedOptions:', await oft.oft.getEnforcedOptions(aptosEndpointId, 1))

        const tx = await oft.setPeer(EndpointId.BSC_TESTNET, BSC_OFT_ADAPTER_ADDRESS)
        const data = tx.data
        const deserialized = deserializeTransactionPayload(data)
        console.log('deserialized:')
        console.dir(deserialized, { depth: null })

        const account = Account.fromDerivationPath({
            path: "m/44'/637'/0'/0'/45'",
            mnemonic: 'test test test test test test test test test test test junk',
        })
        const signed = await aptos.transaction.sign({
            signer: account,
            transaction: deserialized,
        })
        console.log('signed:')
        console.dir(signed, { depth: null })
        const committedTransaction = await aptos.transaction.submit.simple({
            transaction: deserialized,
            senderAuthenticator: signed,
        })

        const executedTransaction = await aptos.waitForTransaction({ transactionHash: committedTransaction.hash })
        console.log('executedTransaction:')
        console.dir(executedTransaction, { depth: null })
    })

    it('Should get delegate', async () => {
        const delegate = await oft.getDelegate()
        console.log('delegate:', delegate)
    })

    it('Should set delegate', async () => {
        const tx = await oft.setDelegate(OFT_ADDRESS)
        console.log('tx:', tx)
    })

    it('Should not be delegate', async () => {
        const isDelegate = await oft.isDelegate(BSC_OFT_ADAPTER_ADDRESS)
        console.log('isDelegate:', isDelegate)
        expect(isDelegate).toBe(false)
    })

    it('Should get peer', async () => {
        const peer = await oft.getPeer(EndpointId.BSC_TESTNET)

        console.log('peer:', peer)
        expect(peer?.toLowerCase()).toBe(BSC_OFT_ADAPTER_ADDRESS.toLowerCase())
    })

    it('Should get owner', async () => {
        const owner = await oft.getOwner()
        console.log('owner:', owner)
    })

    it('Should have peer', async () => {
        const hasPeer = await oft.hasPeer(EndpointId.BSC_TESTNET, BSC_OFT_ADAPTER_ADDRESS)
        console.log('hasPeer:', hasPeer)
        expect(hasPeer).toBe(true)
    })

    it('Should not have peer for Ethereum', async () => {
        const hasPeer = await oft.hasPeer(EndpointId.ETHEREUM_MAINNET, '0x1234567890123456789012345678901234567890')
        console.log('hasPeer:', hasPeer)
        expect(hasPeer).toBe(false)
    })
})
