import 'hardhat-deploy'
import '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { HardhatUserConfig } from 'hardhat/types'

/**
 * This is a dummy hardhat config that enables us to test
 * hardhat functionality without mocking too much
 */
const config: HardhatUserConfig = {
    networks: {
        withEndpointId: {
            eid: EndpointId.ETHEREUM_V2_MAINNET,
            url: 'no:///way',
            saveDeployments: false,
        },
        withoutEndpointId: {
            url: 'no:///way',
            saveDeployments: false,
        },
    },
}

export default config
