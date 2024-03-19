import { extendConfig } from 'hardhat/config'
import {
    createErrorParser,
    getHardhatNetworkOverrides,
    resolveSimulationConfig,
    withLayerZeroArtifacts,
    withLayerZeroDeployments,
} from '@layerzerolabs/devtools-evm-hardhat'

// Here we extend the HardhatUserConfig types & import all the LayerZero tasks
import '@layerzerolabs/devtools-evm-hardhat/type-extensions'
import '@layerzerolabs/devtools-evm-hardhat/tasks'
import '@layerzerolabs/ua-devtools-evm-hardhat/tasks'
import { OmniSDK } from '@layerzerolabs/devtools-evm'
import { createModuleLogger } from '@layerzerolabs/io-devtools'

// Register a hardhat-specific error parser factory on the OmniSDK
OmniSDK.registerErrorParserFactory(createErrorParser)

extendConfig((config, userConfig) => {
    // First we get the LayerZero config
    const layerZero = userConfig.layerZero

    // Now we check the config for packages from which to import artifacts
    const artifactSourcePackages = layerZero?.artifactSourcePackages ?? [
        '@layerzerolabs/lz-evm-sdk-v2',
        '@layerzerolabs/test-devtools-evm-hardhat',
    ]

    // And we check the config for packages from which to import deployments as well
    const deploymentSourcePackages = layerZero?.deploymentSourcePackages ?? ['@layerzerolabs/lz-evm-sdk-v2']

    // Here we create our two config extenders, two curried functions
    // that accept hardhat user config and return a hardhat user config with external
    // artifacts and deployments configured
    const withArtifacts = withLayerZeroArtifacts(...artifactSourcePackages)
    const withDeployments = withLayerZeroDeployments(...deploymentSourcePackages)

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

    // !!!!!!!!!!!!!!!!!!!!! EXPERIMENTAL !!!!!!!!!!!!!!!!!!!!!
    //
    // If the LZ_EXPERIMENTAL_WITH_SIMULATION environment variable is set, we'll apply
    // the simulation settings
    //
    // This feature is still in developer preview and requires familiarity with the code
    // and knowledge of the requirements & developer flow
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
