import { HardhatUserConfig } from 'hardhat/types'
import baseConfig from '../../../hardhat.config'

/**
 * This config will have artifactSourcePackages set to an array of package names
 *
 * (we'll exclude the test package containing the `EndpointV2Mock`)
 */
const config: HardhatUserConfig = {
    ...baseConfig,
    layerZero: {
        ...baseConfig.layerZero,
        artifactSourcePackages: ['@layerzerolabs/lz-evm-sdk-v2'],
    },
}

export default config
