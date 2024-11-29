import {
    Account,
    Aptos,
    AptosConfig,
    Ed25519PrivateKey,
    InputGenerateTransactionPayloadData,
    Network,
} from '@aptos-labs/ts-sdk'

import { Endpoint } from '../sdk/endpoint'
import { EndpointId } from '@layerzerolabs/lz-definitions-v3'
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

    describe('batch payload testing', () => {
        it.only('should send a batch payload', async () => {
            const signer_account = Account.fromPrivateKey({
                privateKey: new Ed25519PrivateKey('0xc4a953452fb957eddc47e309b5679c020e09c4d3c872bda43569cbff6671dca6'),
                address: '0x3d24005f22a2913a9e228547177a01a817fcd5bbaa5290b07fe4826f3f31be4a',
            })
            const transactions: InputGenerateTransactionPayloadData[] = []
            for (let i = 0; i < 10; i += 1) {
                const transaction: InputGenerateTransactionPayloadData = {
                    function: `${'0x8401fa82eea1096b32fd39207889152f947d78de1b65976109493584636622a8'}::oapp_core::set_delegate`,
                    functionArguments: ['0x3d24005f22a2913a9e228547177a01a817fcd5bbaa5290b07fe4826f3f31be4a'],
                }
                transactions.push(transaction)
            }

            // Sign and submit all transactions as fast as possible (throws if any error)
            await aptos.transaction.batch.forSingleAccount({ sender: signer_account, data: transactions })

            
        })
    })
})
