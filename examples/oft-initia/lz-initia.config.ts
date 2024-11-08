import { LzInitiaConfig } from '@layerzerolabs/lz-initia-cli'
import { Chain, chainAndStageToNetwork, EndpointVersion, Environment, Stage } from '@layerzerolabs/lz-definitions'
import path from 'path'
import { MnemonicKey } from '@initia/initia.js'

const INITIA_SANDBOX_LOCAL = chainAndStageToNetwork(Chain.INITIA, Stage.SANDBOX, Environment.LOCAL)
const INITIA_TESTNET = chainAndStageToNetwork(Chain.INITIA, Stage.TESTNET, Environment.TESTNET)
const INITIA_MAINNET = chainAndStageToNetwork(Chain.INITIA, Stage.MAINNET, Environment.MAINNET)
// const contractWorkspace = './contracts'

import dotenv from 'dotenv'

// Load .env file explicitly
dotenv.config({ path: path.resolve(__dirname, '.env') })

// console.log('After dotenv load - Environment variables:', {
//   DEPLOYER_PATH: process.env.DEPLOYER_PATH,
//   DEPLOYER_MNEMONIC: process.env.DEPLOYER_MNEMONIC
// });

const DEPLOYER_PATH = process.env.DEPLOYER_PATH
const DEPLOYER_MNEMONIC = process.env.DEPLOYER_MNEMONIC

if (!DEPLOYER_PATH || !DEPLOYER_MNEMONIC) {
    throw new Error('DEPLOYER_PATH and DEPLOYER_MNEMONIC must be set in environment variables')
}

const [, , COIN_TYPE, ACCOUNT, , INDEX] = DEPLOYER_PATH!.split('/')
const MNEMONIC_KEY = new MnemonicKey({
    mnemonic: DEPLOYER_MNEMONIC,
    account: parseInt(ACCOUNT!),
    index: parseInt(INDEX!),
    coinType: parseInt(COIN_TYPE!),
})

const contractWorkspace = './contracts'

const config: LzInitiaConfig = {
    artifactsPath: './artifacts',
    deploymentPath: './deployments',
    compatibleVersions: [EndpointVersion.V2],
    network: {
        [Environment.LOCAL]: 'http://127.0.0.1:8080',
        [Environment.TESTNET]: 'https://lcd.initiation-2.initia.xyz',
    },
    defaultDeployer: {
        [INITIA_SANDBOX_LOCAL]: MNEMONIC_KEY,
        [INITIA_TESTNET]: MNEMONIC_KEY,
        [INITIA_MAINNET]: MNEMONIC_KEY,
    },
    gasPrice: {
        // [INITIA_SANDBOX_LOCAL]: 1000,
        // [INITIA_TESTNET]: 1000,
        // [INITIA_MAINNET]: 1000,
    },
    // baseModules: ["PATH_TO_ANOTHER_LZ_INITIA_CONFIG_FILE"],
    modules: {
        MyOFT: {
            modulePath: 'programs/oft', // 6: modulePath is the path to the file
            // addresses: {
            //     MyOFT: '_',
            // },
            deployer: {
                'initia-sandbox-local': MNEMONIC_KEY,
                'initia-testnet': MNEMONIC_KEY,
            },
        },
        // layerzero_common: {
        //   modulePath: path.join(contractWorkspace, "layerzero-common"),
        //   deployer: {
        //     "initia-sandbox-local": Account.fromPrivateKey({
        //       privateKey: process.env.LAYERZERO_DEPLOYER,
        //     }),
        //   },
        // },
        // executor_v2: {
        //   alias: "ExecutorV2",
        //   modulePath: path.join(contractWorkspace, "executor/executor-v2"),
        //   deployer: Account.fromPrivateKey({
        //     privateKey: process.env.EXECUTOR_DEPLOYER,
        //   }),
        // },
        executor_auth: {
            modulePath: path.join(contractWorkspace, 'executor/executor-auth'),
            variant: process.env.SUFFIX_EXECUTOR,
        },
    },
}

export default config
