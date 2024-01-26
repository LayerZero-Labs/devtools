import { HardhatUserConfig } from 'hardhat/types'
import baseConfig from './hardhat.config'

/**
 * This config will have no eid properties configured for networks
 * so that we can test tasks that perform logic based on the existence of eid
 */
const config: HardhatUserConfig = {
    ...baseConfig,
    networks: {
        vengaboys: {
            ...baseConfig.networks?.vengaboys,
            eid: undefined,
        },
        britney: {
            ...baseConfig.networks?.britney,
            eid: undefined,
        },
    },
}

export default config
