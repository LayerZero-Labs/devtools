import { task } from 'hardhat/config'
import { deployContract, setupDefaultEndpointV2 } from '@layerzerolabs/test-setup-devtools-evm-hardhat'

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
    await deployContract('EndpointV2', true)
    await setupDefaultEndpointV2()

    // Deploy the OmniCounter
    await deployContract('OmniCounter', true)
})
