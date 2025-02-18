import { HardhatUserConfig } from 'hardhat/types'
import baseConfig from '../../../hardhat.config'

/**
 * This config will have deploymentSourcePackages set to undefined
 * so that the default value is used
 */
const config: HardhatUserConfig = {
    ...baseConfig,
    layerZero: {
        ...baseConfig.layerZero,
        deploymentSourcePackages: undefined,
    },
}

export default config
