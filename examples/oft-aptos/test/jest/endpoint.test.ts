import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { expect } from 'chai'

import { EndpointId } from '@layerzerolabs/lz-definitions'

import { Endpoint } from '../../sdk/endpoint'
const ENDPOINT_ADDRESS = '0xa53352d6eb261173560111b83eb898611a8e87f7dabada415159f749fbd185e4'

describe('endpoint-tests', () => {
    let aptos: Aptos
    let endpoint: Endpoint

    beforeEach(async () => {
        const config = new AptosConfig({ network: Network.TESTNET })
        aptos = new Aptos(config)
        endpoint = new Endpoint(aptos, ENDPOINT_ADDRESS)
    })

    describe('get libraries', () => {
        it('Should get default send library', async () => {
            const sendLibrary = await endpoint.getDefaultSendLibrary(EndpointId.BSC_V2_TESTNET)
            console.log(sendLibrary)
            expect(sendLibrary).to.not.be.undefined
        })

        it('Should get default receive library', async () => {
            const receiveLibrary = await endpoint.getDefaultReceiveLibrary(EndpointId.BSC_V2_TESTNET)
            console.log(receiveLibrary)
            expect(receiveLibrary).to.not.be.undefined
        })

        it('should get receive library timeout duration', async () => {
            const timeout = await endpoint.getReceiveLibraryTimeout(
                '0xaa9ca3588e3919c04f030ad14b55aba408eac6930a40e0b463b4299fd176bb88',
                EndpointId.BSC_V2_TESTNET
            )
            console.log(`timeout: ${timeout}`)
            console.dir(timeout, { depth: null })
            expect(timeout.expiry.toString()).to.equal('696969669')
        })
    })
})
