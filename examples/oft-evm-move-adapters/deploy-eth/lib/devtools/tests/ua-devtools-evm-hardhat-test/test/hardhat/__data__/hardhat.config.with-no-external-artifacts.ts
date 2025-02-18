import { HardhatUserConfig } from 'hardhat/types'
import baseConfig from '../../../hardhat.config'

/**
 * This config will have artifactSourcePackages set to an empty array
 */
const config: HardhatUserConfig = {
    ...baseConfig,
    layerZero: {
        ...baseConfig.layerZero,
        artifactSourcePackages: [],
    },
}

export default config
