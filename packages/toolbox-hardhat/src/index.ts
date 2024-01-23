import { extendConfig } from 'hardhat/config'
import {
    createErrorParser,
    withLayerZeroArtifacts,
    withLayerZeroDeployments,
} from '@layerzerolabs/devtools-evm-hardhat'

// Here we extend the HardhatUserConfig types & import all the LayerZero tasks
import '@layerzerolabs/devtools-evm-hardhat/type-extensions'
import '@layerzerolabs/ua-devtools-evm-hardhat/tasks'
import { OmniSDK } from '@layerzerolabs/devtools-evm'

// Here we create our two config extenders, two curried functions
// that accept hardhat user config and return a hardhat user config with external
// artifacts and deployments configured
const withDeployments = withLayerZeroDeployments('@layerzerolabs/lz-evm-sdk-v2')
const withArtifacts = withLayerZeroArtifacts('@layerzerolabs/lz-evm-sdk-v2', '@layerzerolabs/test-devtools-evm')

// Register a hardhat-specific error parser factory on the OmniSDK
OmniSDK.registerErrorParserFactory(createErrorParser)

extendConfig((config, userConfig) => {
    // To stay on the safe side we'll only use the external configuration
    // of the extended config and we won't even import the type extensions from hardhat-deploy
    // just in case the import path changes in one of the versions
    //
    // As a result we'll need to type the result of our function call as { external: unknown }
    const { external } = withArtifacts(withDeployments(userConfig)) as { external: unknown }

    // To remain on the safe side we are staying on we'll only extend the config
    // if we got any external deployments
    if (external != null) {
        Object.assign(config, { external })
    }
})
