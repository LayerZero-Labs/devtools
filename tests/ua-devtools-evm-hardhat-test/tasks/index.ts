import { task } from 'hardhat/config'
import { setupDefaultEndpoint } from '../test/__utils__/endpoint'
import { deployOApp } from '../test/__utils__/oapp'

/**
 * Task that will:
 *
 * - Deploy EndpointV2-related infrastructure
 * - Wire the EndpointV2-related infrastructure with default configuration
 * - Deploy the DefaultOApp
 *
 * If you want to expose the networks locally
 * and deploy your own endpoints, this task is tjust for you!
 *
 * See the root README.md section for info about how to expose networks locally
 */
task('lz:test:oapp:deploy', 'Deploy the test OApp on a default EndpointV2 infrastructure', async () => {
    // Deploy the DefaultOApp along with the EndpointV2
    //
    // This will wipe the existing deployments so watch out
    await deployOApp()

    // This will wire up the endpoints
    await setupDefaultEndpoint()
})
