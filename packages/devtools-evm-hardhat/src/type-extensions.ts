import 'hardhat/types/config'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ConnectSafeConfigWithSafeAddress } from '@safe-global/protocol-kit'
import { SimulationUserConfig } from '@/simulation/types'

/**
 * Packages containing external artifacts can be specified either
 *
 * - By just their package name, in which case the artifacts will be loaded from the `./artifacts` path
 * - By their package name and a specific path to the artifacts directory
 * - By a filesystem path
 */
export type ArtifactPackage = ArtifactPackageName | ArtifactPackageWithPath | ArtifactPackagePath

export type ArtifactPackageName = string

export interface ArtifactPackageWithPath {
    name: ArtifactPackageName
    path?: string
}

export interface ArtifactPackagePath {
    name?: never
    path: string
}

declare module 'hardhat/types/config' {
    interface HardhatNetworkUserConfig {
        eid?: never
        safeConfig?: never
    }

    interface HardhatNetworkConfig {
        eid?: never
        safeConfig?: never
    }

    interface HttpNetworkUserConfig {
        /**
         * Specifies the mapping between the network
         * defined in your hardhat config and the LayerZero endpoint ID
         * on this network.
         *
         * This allows you to use arbitrary network names while maintaining
         * allowing you to easily find deployment and artifact information
         * for LayerZero protocol contracts using the standard hardhat deploy methods
         */
        eid?: EndpointId

        /**
         * Use a "local" LayerZero environment for the network.
         *
         * Local environments are postfixed with `-local` in the deployment directories
         * and represent contracts deployed to ephemerous development networks.
         *
         * Local environments cannot coexists with their non-local counterparts
         * in hardhat configs since they share the same `eid`
         */
        isLocalEid?: boolean

        /**
         * Optional gnosis safe config.
         */
        safeConfig?: SafeConfig
    }

    interface HttpNetworkConfig {
        /**
         * Specifies the mapping between the network
         * defined in your hardhat config and the LayerZero endpoint ID
         * on this network.
         *
         * This allows you to use arbitrary network names while maintaining
         * allowing you to easily find deployment and artifact information
         * for LayerZero protocol contracts using the standard hardhat deploy methods
         */
        eid?: EndpointId

        /**
         * Use a "local" LayerZero environment for the network.
         *
         * Local environments are postfixed with `-local` in the deployment directories
         * and represent contracts deployed to ephemerous development networks
         *
         * Local environments cannot coexists with their non-local counterparts
         * in hardhat configs since they share the same `eid`
         */
        isLocalEid?: boolean

        /**
         * Optional gnosis safe config.
         */
        safeConfig?: SafeConfig
    }
    interface SafeConfig extends ConnectSafeConfigWithSafeAddress {
        safeUrl: string // Note:  This is the URL of the Safe API, not the safe itself
        safeAddress: string // override to make ConnectSafeConfig.safeAddress mandatory
        safeApiKey: string
    }

    interface HardhatUserConfig {
        /**
         * LayerZero advanced configuration
         */
        layerZero?: LayerZeroHardhatUserConfig
    }

    interface LayerZeroHardhatUserConfig {
        /**
         * Defines the names of @layerzerolabs packages
         * that will be added to your hardhat config under external deployments.
         *
         * By default, the protocol deployments from `@layerzerolabs/lz-evm-sdk-v2`
         * will be added which allows your scripts to reference deployments
         * of protocol contracts such as `EndpointV2`:
         *
         * ```
         * // In your deploy script or task
         * const { address, abi } = hre.deployments.get('EndpointV2')
         * ```
         *
         * @default ['@layerzerolabs/lz-evm-sdk-v2']
         */
        deploymentSourcePackages?: string[]

        /**
         * Defines the names of @layerzerolabs packages
         * that will be added to your hardhat config under external artifacts.
         *
         * By default, the protocol artifacts from `@layerzerolabs/lz-evm-sdk-v2`
         * will be added which allows your scripts to reference artifacts
         * of protocol contracts such as `EndpointV2`:
         *
         * ```
         * // In your deploy script or task
         * const { address, abi } = hre.deployments.get('EndpointV2')
         * ```
         *
         * For testing purposes, artifacts from `@layerzerolabs/test-devtools-evm-hardhat`
         * will also be added. This allows your tests to reference contracts such as `EndpointV2Mock`:
         *
         * ```
         * // In your hardhat test
         * const EndpointV2MockArtifact = await hre.deployments.getArtifact('EndpointV2Mock')
         * ```
         *
         * @default ['@layerzerolabs/lz-evm-sdk-v2','@layerzerolabs/test-devtools-evm-hardhat']
         */
        artifactSourcePackages?: ArtifactPackage[]

        /**
         * Configuration of features that are not considered stable yet
         */
        experimental?: {
            /**
             * Configuration for omnichain simulation
             *
             * Omnichain simulation allows developers to easily setup
             * local environment forked from live networks without
             * having to adjust the `hardhat.config.ts` file
             */
            simulation?: SimulationUserConfig
        }
    }
}
