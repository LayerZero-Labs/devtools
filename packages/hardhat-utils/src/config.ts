import "hardhat-deploy/dist/src/type-extensions"

import { chainAndStageToNetwork, networkToStage, Chain, Stage } from "@layerzerolabs/lz-definitions"
import { HardhatUserConfig, NetworksConfig } from "hardhat/types"
import { join } from "path"

/**
 * Adds external deployments directories for all configured networks.
 *
 * This function takes the root `deploymentsDir` path to the deployments folder
 * and maps all configured networks to point to the network directories under this root path.
 *
 * ```typescript
 * const config = {
 *   networks: {
 *     "slipknot-testnet": {}
 *   }
 * }
 *
 * const configWithExternals = withExternalDeployments("./path/to/some/deployments/folder")(config);
 *
 * // The configWithExternals will now look like this:
 *
 * {
 *   external: {
 *     deployments: {
 *       "slipknot-testnet": ["./path/to/some/deployments/folder/slipknot-testnet"]
 *     }
 *   },
 *   networks: {
 *     "slipknot-testnet": {}
 *   }
 * }
 * ```
 *
 * @param deploymentsDir Path to the external deployments directory
 *
 * @returns `HardhatUserConfig`
 */
export const withExternalDeployments =
    (deploymentsDir: string) =>
    <THardhatUserConfig extends HardhatUserConfig>(config: THardhatUserConfig): THardhatUserConfig => ({
        ...config,
        external: {
            ...config.external,
            deployments: Object.fromEntries(
                // Map the configured networks into entries for the external deployments object
                Object.keys(config.networks ?? {}).map((networkName: string) => {
                    return [
                        // The external deployments object is keyed by network names
                        networkName,
                        // And its values are arrays of filesystem paths referring to individual network deployment directories
                        Array.from(
                            // Since we want the paths to be unique, we'll put everything we have into a Set, then convert back to array
                            new Set(
                                // These are the external deployments already configured
                                config.external?.deployments?.[networkName] ?? []
                            ).add(
                                // And we're going to add a new one by concatenating the root deployments directory with the network name
                                join(deploymentsDir, networkName)
                            )
                        ),
                    ]
                })
            ),
        },
    })

/**
 * Helper utility that takes in an array of Chain identifiers
 * and maps them to network names.
 *
 * If there are no chains defined, the defaults are supplied from the network config
 *
 * @param config `NetworksConfig`
 * @param stage `Stage`
 *
 * @returns `(chains: Chain[] | null | undefined) => string[]`
 */
export const createGetDefinedNetworkNamesOnStage =
    (config: NetworksConfig) =>
    (stage: Stage, chains: Chain[] | null | undefined): string[] => {
        const definedNetworks = Object.keys(config).sort()
        const definedNetworksSet = new Set(definedNetworks)

        return (
            chains
                // We map the chains (e.g. bsc, avalanche) to network names (e.g. bsc-testnet)
                ?.map((chain: Chain) => chainAndStageToNetwork(chain, stage))
                // Filter out networks that have not been defined in the config
                // (since we just created them with the correct stage, we don't need to filter by stage)
                .filter((networkName) => definedNetworksSet.has(networkName)) ??
            // But if we nothing has been provided, we take all the networks from hardhat config
            definedNetworks
                // And filter out the networks for this stage (since we know all of thse have been defined)
                .filter(isNetworkOnStage(stage))
        )
    }

/**
 * Helper utility that safely calls networkToStage
 * to determine whether a network name is on stage
 *
 * @param stage `Stage`
 * @returns `true` if network is a valid network name and is on stage, `false` otherwise
 */
const isNetworkOnStage = (stage: Stage) => (networkName: string) => {
    try {
        return networkToStage(networkName) === stage
    } catch {
        return false
    }
}
