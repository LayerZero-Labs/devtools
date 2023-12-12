import { task } from 'hardhat/config'
import { setupDefaultEndpoint } from '../test/__utils__/endpoint'

/**
 * If you want to expose the networks locally
 * and deploy your own endpoints, this task will do just that
 *
 * See the root README.md section for info about how to expose networks locally
 */
task('lz:test:endpoint:wire', 'Wire the test endpoint', async () => {
    await setupDefaultEndpoint()
})
