import 'hardhat-deploy'
import 'hardhat-contract-sizer'
import '@nomiclabs/hardhat-ethers'
import { HardhatUserConfig } from 'hardhat/types'

import './tasks/'

const config: HardhatUserConfig = {
    solidity: '0.8.19',

    namedAccounts: {
        deployer: {
            default: 0, // wallet address of index[0], of the mnemonic in .env
        },
    },
}

export default config
