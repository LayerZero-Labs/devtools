import { OFT } from '../src/oft/sdk'
import { EndpointId } from '@layerzerolabs/lz-definitions'

const URL = 'https://lcd.initiation-2.initia.xyz'
const OFT_ADDRESS = '0x55b509e1335073053b92da58bbae7fe81d7c4c51'
const MNEMONIC = process.env.MNEMONIC ?? ''
const PATH = process.env.PATH ?? "m/44'/118'/0'/0/0"
const BSC_OFT_ADAPTER_ADDRESS = '000000000000000000000000D8AdBb52399E141B422F64A1D39291f5a391c434'

describe('ua-devtools-initia', () => {
    it('Should set peer', async () => {
        const oft = new OFT(OFT_ADDRESS, URL, MNEMONIC, PATH)
        console.log('oft.isInitialized:', await oft.isInitialized())
        console.log('oft.oft.getAdmin:', await oft.oft.getAdmin())
        console.log('oft.oft.getEnforcedOptions:', await oft.oft.getEnforcedOptions(40326, 1))

        const tx = await oft.setPeer(EndpointId.BSC_TESTNET, BSC_OFT_ADAPTER_ADDRESS)
        console.log('tx:', tx)
    })
    it('Should get delegate', async () => {
        const oft = new OFT(OFT_ADDRESS, URL, MNEMONIC, PATH)
        const delegate = await oft.getDelegate()
        console.log('delegate:', delegate)
    })
    it('Should get peer', async () => {
        const oft = new OFT(OFT_ADDRESS, URL, MNEMONIC, PATH)
        const peer = await oft.getPeer(EndpointId.BSC_TESTNET)
        console.log('peer:', peer)
    })
    it('Should get owner', async () => {
        const oft = new OFT(OFT_ADDRESS, URL, MNEMONIC, PATH)
        const owner = await oft.getOwner()
        console.log('owner:', owner)
    })
})
