import 'hardhat-deploy/dist/src/type-extensions'

import { endpointIdToNetwork } from '@layerzerolabs/lz-definitions'
import { HardhatUserConfig } from 'hardhat/types'
import { join, dirname } from 'path'
import { createModuleLogger } from '@layerzerolabs/io-devtools'
import type { ArtifactPackage } from './type-extensions'

const resolvePackageDirectory = (packageName: string): string => {
    // The tricky bit here is the fact that if we resolve packages by their package name,
    // we might be pointed to a file in some dist directory - node will just pick up the `main`
    // entry in package.json and point us there
    //
    // So in order to get a stable path we choose package.json, pretty solid choice
    const packageJsonName = join(packageName, 'package.json')
    // We now resolve the path to package.json
    const packageJsonPath = require.resolve(packageJsonName)
    // And return its directory
    return dirname(packageJsonPath)
}

const resolveArtifactsPath = (artifactsPackage: ArtifactPackage): string => {
    // In case the package was specified as a package name only, we'll resolve its filesystem location
    // and use the default `artifacts` directory
    if (typeof artifactsPackage === 'string') {
        return join(resolvePackageDirectory(artifactsPackage), 'artifacts')
    }

    // In case the package was specified as an object, we'll use the `path` property to point to the artifacts directory
    if (artifactsPackage.name != null) {
        return join(resolvePackageDirectory(artifactsPackage.name), artifactsPackage.path ?? 'artifacts')
    }

    // In case the package was specified as a `path` only, we'll use that as the final artifacts path
    return artifactsPackage.path
}

/**
 * Helper utility that adds external deployment paths for all LayzerZero enabled networks.
 * This will make LayerZero contracts available in your deploy scripts and tasks.
 *
 * ```
 * // hardhat.config.ts
 * import { EndpointId } from "@layerzerolabs/lz-definitions"
 *
 * const config: HardhatUserConfig = {
 *   networks: {
 *     arbitrum: {
 *       eid: EndpointId.ARBITRUM_MAINNET
 *     },
 *     fuji: {
 *       eid: EndpointId.AVALANCHE_TESTNET
 *     }
 *   }
 * }
 *
 * export default withLayerZeroDeployments("@layerzerolabs/lz-evm-sdk-v1")
 * ```
 *
 * @param packageNames `string[]` List of @layerzerolabs package names that contain deployments directory
 *
 * @returns `<THardhatUserConfig extends HardhatUserConfig>(config: THardhatUserConfig): THardhatUserConfig` Hardhat config decorator
 */
export const withLayerZeroDeployments = (...packageNames: string[]) => {
    const resolvedDeploymentsDirectories = packageNames
        // The first thing we do is we resolve the paths to LayerZero packages
        .map(resolvePackageDirectory)
        // Then navigate to the deployments folder
        .map((resolvedPackagePath) => join(resolvedPackagePath, 'deployments'))

    // We return a function that will enrich hardhat config with the external deployments configuration
    //
    // This is a pretty standard way of enriching configuration files that leads to quite nice consumer code
    return <THardhatUserConfig extends HardhatUserConfig>(config: THardhatUserConfig): THardhatUserConfig => ({
        ...config,
        external: {
            ...config.external,
            // Now for the meat of the operation, we'll enrich the external.deployments object
            deployments: Object.fromEntries(
                Object.entries(config.networks ?? {}).flatMap(([networkName, networkConfig]) => {
                    const eid = networkConfig?.eid
                    const networkLogger = createModuleLogger(networkName)

                    // Let's first check whether eid is defined on the network config
                    if (eid == null) {
                        networkLogger.debug(
                            'Endpoint ID not specified in hardhat config, skipping external deployment configuration'
                        )

                        return []
                    }

                    try {
                        // This operation is unsafe and can throw - let's make sure we don't explode with some unreadable error
                        const layerZeroNetworkName = endpointIdToNetwork(eid, networkConfig?.isLocalEid)
                        const layerZeroNetworkDeploymentsDirectories = resolvedDeploymentsDirectories.map(
                            (deploymentsDirectory) => join(deploymentsDirectory, layerZeroNetworkName)
                        )

                        return [
                            [
                                // The external deployments object is keyed by local network names
                                // which do not necessarily match the LayerZero ones
                                networkName,
                                // And its values are arrays of filesystem paths referring to individual network deployment directories
                                Array.from(
                                    // Since we want the paths to be unique, we'll put everything we have into a Set, then convert back to array
                                    new Set([
                                        // These are the external deployments already configured
                                        ...(config.external?.deployments?.[networkName] ?? []),
                                        // And these are the new ones
                                        ...layerZeroNetworkDeploymentsDirectories,
                                    ])
                                ),
                            ],
                        ]
                    } catch (error) {
                        networkLogger.error(
                            `Invalid endpoint ID specified in hardhat config (${eid}), skipping external deployment configuration`
                        )

                        return []
                    }
                })
            ),
        },
    })
}

/**
 * Helper utility that appends external artifacts directories
 * to existing hadrhat config
 *
 * ```
 * // hardhat.config.ts
 * import { EndpointId } from "@layerzerolabs/lz-definitions"
 *
 * const config: HardhatUserConfig = {
 *   networks: {
 *     arbitrum: {
 *       eid: EndpointId.ARBITRUM_MAINNET
 *     },
 *     fuji: {
 *       eid: EndpointId.AVALANCHE_TESTNET
 *     }
 *   }
 * }
 *
 * export default withLayerZeroArtifacts("@layerzerolabs/lz-evm-sdk-v1")
 * ```
 *
 * @param packageNames `string[]`
 *
 * @returns `<THardhatUserConfig extends HardhatUserConfig>(config: THardhatUserConfig): THardhatUserConfig` Hardhat config decorator
 */
export const withLayerZeroArtifacts = (...artifactPackages: ArtifactPackage[]) => {
    const resolvedArtifactsDirectories = artifactPackages
        // The first thing we do is we resolve the artifact package definitions into filesystem paths
        .map(resolveArtifactsPath)

    // We return a function that will enrich hardhat config with the external artifacts configuration
    //
    // This is a pretty standard way of enriching configuration files that leads to quite nice consumer code
    return <THardhatUserConfig extends HardhatUserConfig>(config: THardhatUserConfig): THardhatUserConfig => {
        // We'll first grab all the external artifacts already defined
        const existingArtifacts = new Set(config.external?.contracts?.flatMap(({ artifacts }) => artifacts) ?? [])

        // And only append stuff if we have something new to say
        const newArtifacts = new Set(
            resolvedArtifactsDirectories.filter((artifact) => !existingArtifacts.has(artifact))
        )
        if (newArtifacts.size === 0) {
            return config
        }

        return {
            ...config,
            external: {
                ...config.external,
                contracts: [
                    ...(config.external?.contracts ?? []),
                    {
                        artifacts: Array.from(newArtifacts),
                    },
                ],
            },
        }
    }
}
