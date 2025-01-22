import { extendConfig } from 'hardhat/config'
import {
    createErrorParser,
    getHardhatNetworkOverrides,
    resolveSimulationConfig,
    withLayerZeroArtifacts,
    withLayerZeroDeployments,
} from '@layerzerolabs/devtools-evm-hardhat'

// Import Hardhat tasks and type extensions
import '@layerzerolabs/devtools-evm-hardhat/type-extensions'
import '@layerzerolabs/devtools-evm-hardhat/tasks'
import '@layerzerolabs/ua-devtools-evm-hardhat/tasks'

import { OmniSDK } from '@layerzerolabs/devtools-evm'
import { createModuleLogger } from '@layerzerolabs/io-devtools'

// Register a hardhat-specific error parser factory on the OmniSDK
OmniSDK.registerErrorParserFactory(createErrorParser)

extendConfig((config, userConfig) => {
    // Extract LayerZero config from userConfig
    const layerZero = userConfig.layerZero

    // Define artifact source packages, including V1 and V2
    const artifactSourcePackages = layerZero?.artifactSourcePackages ?? [
        '@layerzerolabs/lz-evm-sdk-v1', // Added V1 SDK
        '@layerzerolabs/lz-evm-sdk-v2',
        '@layerzerolabs/test-devtools-evm-hardhat',
    ]

    // Define deployment source packages, including V1 and V2
    const deploymentSourcePackages = layerZero?.deploymentSourcePackages ?? [
        '@layerzerolabs/lz-evm-sdk-v1', // Added V1 SDK
        '@layerzerolabs/lz-evm-sdk-v2',
    ]

    // Create config extenders for artifacts and deployments
    const withArtifacts = withLayerZeroArtifacts(...artifactSourcePackages)
    const withDeployments = withLayerZeroDeployments(...deploymentSourcePackages)

    // Apply artifact and deployment configurations
    const { external } = withArtifacts(withDeployments(userConfig)) as { external: unknown }

    // Merge external deployments if available
    if (external != null) {
        Object.assign(config, { external })
    }

    // !!!!!!!!!!!!!!!!!!!!! EXPERIMENTAL !!!!!!!!!!!!!!!!!!!!!
    //
    // If the LZ_EXPERIMENTAL_WITH_SIMULATION environment variable is set, apply
    // simulation settings. This feature is experimental and requires caution.
    //
    // !!!!!!!!!!!!!!!!!!!!! EXPERIMENTAL !!!!!!!!!!!!!!!!!!!!!
    if (process.env.LZ_EXPERIMENTAL_WITH_SIMULATION) {
        const logger = createModuleLogger('simulation')

        logger.warn('')
        logger.warn(`The experimental simulation mode is enabled`)
        logger.warn(`This feature is still in developer preview`)
        logger.warn('')
        logger.warn(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`)
        logger.warn(`!!! ONLY USE AT YOUR OWN RISK !!!`)
        logger.warn(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`)
        logger.warn('')
        logger.warn(`The networks in your hardhat config will be forked`)
        logger.warn('')

        const simulationConfig = resolveSimulationConfig(layerZero?.experimental?.simulation ?? {}, config)
        const networks = getHardhatNetworkOverrides(simulationConfig, config.networks)

        Object.assign(config, { networks: { ...config.networks, ...networks } })

        logger.warn(`The new network configuration is as follows:`)
        logger.warn('')

        Object.entries(config.networks).forEach(([networkName, networkConfig]) => {
            if ('url' in networkConfig) {
                logger.warn(`Network ${networkName} -> ${networkConfig.url}`)
            }
        })

        logger.warn('')
    }
})
