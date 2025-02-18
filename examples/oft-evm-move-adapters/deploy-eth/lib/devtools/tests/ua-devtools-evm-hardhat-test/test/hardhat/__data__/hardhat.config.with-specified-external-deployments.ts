import { HardhatUserConfig } from 'hardhat/types'
import baseConfig from '../../../hardhat.config'

/**
 * This config will have deploymentSourcePackages set to an array of package names
 */
const config: HardhatUserConfig = {
    ...baseConfig,
    layerZero: {
        ...baseConfig.layerZero,
        deploymentSourcePackages: ['@layerzerolabs/lz-evm-sdk-v2'],
    },
}

export default config
