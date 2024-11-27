import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { Endpoint } from '../sdk/endpoint'
import { EndpointId } from '@layerzerolabs/lz-definitions'
const ENDPOINT_ADDRESS = '0xd9fbd5191a9864742464950e4e850786b60d26b1349dcc2227de294c7b2b32c5'

describe('oft-tests', () => {
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
        it.only('Should get default send library', async () => {
            const sendLibrary = await endpoint.getSendLibrary(EndpointId.APTOS_MAINNET)
            console.log(sendLibrary)
            expect(sendLibrary).toBeDefined()
        })

        it('Should get default receive library', async () => {
            const receiveLibrary = await endpoint.getReceiveLibrary(EndpointId.APTOS_MAINNET)
            console.log(receiveLibrary)
            expect(receiveLibrary).toBeDefined()
        })
    })
})
