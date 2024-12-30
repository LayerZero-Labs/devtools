import 'hardhat/types'

declare module 'hardhat/types' {
    export interface HttpNetworkUserConfig {
        eid: number
    }

    // eslint-disable-next-line import/export
    export interface HardhatNetworkUserConfig {
        eid: number
    }

    // eslint-disable-next-line import/export
    export interface HardhatNetworkUserConfig {
        eid: number
    }

    export interface HardhatUserConfig {
        namedAccounts?: {
            deployer: {
                default: number
            }
        }
    }
}
