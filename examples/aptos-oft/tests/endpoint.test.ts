import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { Endpoint } from '../sdk/endpoint'
import { EndpointId } from '@layerzerolabs/lz-definitions'
const ENDPOINT_ADDRESS = '0x824f76b2794de0a0bf25384f2fde4db5936712e6c5c45cf2c3f9ef92e75709c'

describe('endpoint-tests', () => {
    let aptos: Aptos
    let endpoint: Endpoint

    beforeEach(async () => {
        const config = new AptosConfig({
            network: Network.CUSTOM,
            fullnode: 'http://127.0.0.1:8080/v1',
            indexer: 'http://127.0.0.1:8090/v1',
            faucet: 'http://127.0.0.1:8081',
        })
        aptos = new Aptos(config)
        endpoint = new Endpoint(aptos, ENDPOINT_ADDRESS)
    })

    describe('get libraries', () => {
        it('Should get default send library', async () => {
            const sendLibrary = await endpoint.getDefaultSendLibrary(EndpointId.BSC_V2_SANDBOX)
            console.log(sendLibrary)
            expect(sendLibrary).toBeDefined()
        })

        it('Should get default receive library', async () => {
            const receiveLibrary = await endpoint.getDefaultReceiveLibrary(EndpointId.BSC_V2_SANDBOX)
            console.log(receiveLibrary)
            expect(receiveLibrary).toBeDefined()
        })
    })
})
