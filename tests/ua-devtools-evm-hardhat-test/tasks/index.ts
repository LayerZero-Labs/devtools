import { task } from 'hardhat/config'
import { deployAndSetupDefaultEndpointV2 } from '@layerzerolabs/test-setup-evm-hardhat'
import { deployOApp } from '../test/__utils__/oapp'
import { deployOmniCounter } from '../test/__utils__/omnicounter'

/**
 * This will deploy and wire up the endpoints.
 */
const deployAndWireEndpoint = async () => {
    await deployAndSetupDefaultEndpointV2(true)
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
    await deployOApp(true)
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
    await deployOmniCounter(true)
})
