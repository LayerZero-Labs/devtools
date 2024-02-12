import 'hardhat/types/config'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ConnectSafeConfig } from '@gnosis.pm/safe-core-sdk'

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
         * Optional gnosis safe config.
         */
        safeConfig?: SafeConfig
    }
    interface SafeConfig extends ConnectSafeConfig {
        safeUrl: string
        safeAddress: string // override to make ConnectSafeConfig.safeAddress mandatory
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
        artifactSourcePackages?: string[]
    }
}
