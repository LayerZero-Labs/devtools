import { task } from 'hardhat/config'
import { deployContract, setupDefaultEndpointV2 } from '@layerzerolabs/test-setup-devtools-evm-hardhat'

/**
 * This will deploy and wire up the endpoints.
 */
const deployAndWireEndpoint = async () => {
    await deployContract('EndpointV2', true)
    await setupDefaultEndpointV2()
}

/**
 * Task that will:
 *
 * - Deploy EndpointV2-related infrastructure
 * - Wire the EndpointV2-related infrastructure with default configuration
 * - Deploy the DefaultOApp
 *
 * If you want to expose the networks locally
 * and deploy your own endpoints, this task is just for you!
 *
 * See the root README.md section for info about how to expose networks locally.
 */
task('lz:test:oapp:deploy', 'Deploy the test OApp on default EndpointV2 infrastructure', async () => {
    await deployAndWireEndpoint()

    // Deploy the DefaultOApp
    await deployContract('OApp', true)
})

/**
 * Task that will:
 *
 * - Deploy EndpointV2-related infrastructure
 * - Wire the EndpointV2-related infrastructure with default configuration
 * - Deploy the OmniCounter
 *
 * If you want to expose the networks locally
 * and deploy your own endpoints, this task is just for you!
 *
 * See the root README.md section for info about how to expose networks locally.
 */
task('lz:test:omnicounter:deploy', 'Deploy the OmniCounter on a default EndpointV2 infrastructure', async () => {
    await deployAndWireEndpoint()

    // Deploy the OmniCounter
    await deployContract('OmniCounter', true)
})

/**
 * Task that will:
 *
 * - Deploy EndpointV2-related infrastructure
 * - Wire the EndpointV2-related infrastructure with default configuration
 * - Deploy the DefaultOAppRead
 *
 * If you want to expose the networks locally
 * and deploy your own endpoints, this task is just for you!
 *
 * See the root README.md section for info about how to expose networks locally.
 */
task('lz:test:oapp-read:deploy', 'Deploy the test OAppRead on default EndpointV2 infrastructure', async () => {
    await deployAndWireEndpoint()

    // Deploy the DefaultOApp
    await deployContract('OAppRead', true)
})
