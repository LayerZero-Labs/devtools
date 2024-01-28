import { HardhatUserConfig } from 'hardhat/types'
import baseConfig from '../../../hardhat.config'

/**
 * This config will have deploymentSourcePackages set to an empty array
 */
const config: HardhatUserConfig = {
    ...baseConfig,
    layerZero: {
        ...baseConfig.layerZero,
        deploymentSourcePackages: [],
    },
}

export default config
