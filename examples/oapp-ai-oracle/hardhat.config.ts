import 'dotenv/config'

import 'hardhat-deploy'
import '@nomiclabs/hardhat-ethers'
import '@layerzerolabs/toolbox-hardhat'
import { HardhatUserConfig, HttpNetworkAccountsUserConfig } from 'hardhat/types'

import { EndpointId } from '@layerzerolabs/lz-definitions'

import './tasks/ai-submit'
import './tasks/verify-decision'
import './tasks/dispatch-decision'
import './tasks/challenge-decision'

// Set your preferred authentication method
const MNEMONIC = process.env.MNEMONIC
const PRIVATE_KEY = process.env.PRIVATE_KEY

const accounts: HttpNetworkAccountsUserConfig | undefined = MNEMONIC
    ? { mnemonic: MNEMONIC }
    : PRIVATE_KEY
      ? [PRIVATE_KEY]
      : undefined

if (accounts == null) {
    console.warn(
        'Could not find MNEMONIC or PRIVATE_KEY environment variables. It will not be possible to execute transactions in your example.'
    )
}

const config: HardhatUserConfig = {
    paths: {
        cache: 'cache/hardhat',
    },
    solidity: {
        compilers: [
            {
                version: '0.8.22',
                settings: {
                    optimizer: { enabled: true, runs: 200 },
                },
            },
        ],
    },
    networks: {
        'eth-sepolia': {
            eid: EndpointId.SEPOLIA_V2_TESTNET,
            url: process.env.RPC_URL_SEPOLIA || 'https://rpc.sepolia.org',
            accounts,
        },
        'bsc-testnet': {
            eid: EndpointId.BSC_V2_TESTNET,
            url: process.env.RPC_URL_BSC_TESTNET || 'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
            accounts,
        },
        hardhat: {
            allowUnlimitedContractSize: true,
        },
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
    },
}

export default config
