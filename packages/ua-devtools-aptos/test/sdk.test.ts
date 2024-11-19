import { OFT } from '../src/oft/sdk'
import { EndpointId, Stage } from '@layerzerolabs/lz-definitions'
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { SDK as AptosSDK } from '@layerzerolabs/lz-aptos-sdk-v2'

const OFT_ADDRESS = '0x58b730d07e98a22f2b357bee721115c986e4dc873c1884763708ee3d4006f74e'
const BSC_OFT_ADAPTER_ADDRESS = '000000000000000000000000D8AdBb52399E141B422F64A1D39291f5a391c434'
const aptosEndpointId = 40326

describe('ua-devtools-initia', () => {
    let oft: OFT

    beforeEach(() => {
        const config = new AptosConfig({
            network: Network.CUSTOM,
            fullnode: 'http://127.0.0.1:8080/v1',
            indexer: 'http://127.0.0.1:8090/v1',
        })
        const aptos = new Aptos(config)
        const sdk = new AptosSDK({
            stage: Stage.SANDBOX,
            provider: aptos,
            accounts: {
                oft: OFT_ADDRESS,
            },
        })
        oft = new OFT(sdk, { eid: aptosEndpointId as EndpointId, address: OFT_ADDRESS })
    })

    it('Should set peer', async () => {
        console.log('oft.isInitialized:', await oft.isInitialized())
        console.log('oft.oft.getAdmin:', await oft.oft.getAdmin())
        console.log('oft.oft.getEnforcedOptions:', await oft.oft.getEnforcedOptions(aptosEndpointId, 1))

        const tx = await oft.setPeer(EndpointId.BSC_TESTNET, BSC_OFT_ADAPTER_ADDRESS)
        console.log('tx:', tx)
    })

    it('Should get delegate', async () => {
        const delegate = await oft.getDelegate()
        console.log('delegate:', delegate)
    })

    it('Should get peer', async () => {
        const peer = await oft.getPeer(EndpointId.BSC_TESTNET)
        console.log('peer:', peer)
    })

    it('Should get owner', async () => {
        const owner = await oft.getOwner()
        console.log('owner:', owner)
    })
})
