import { OFT } from '../src/oft/sdk'
import { EndpointId, Stage, SandboxV2EndpointId } from '@layerzerolabs/lz-definitions'
import { Account, Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { SDK as AptosSDK } from '@layerzerolabs/lz-aptos-sdk-v2'
import { deserializeTransactionPayload } from '../../devtools-aptos/src/signer/serde'
const OFT_ADDRESS = '0xfc07ed99874d8dab5174934e2e5ecafd5bc4fad2253cd4f7a7b23d5268a9b3e3'
const BSC_OFT_ADAPTER_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'
const aptosEndpointId = SandboxV2EndpointId.APTOS_V2_SANDBOX

function setPeer(peer) {
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
}