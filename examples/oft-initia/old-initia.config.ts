import 'dotenv/config'
import { LzInitiaConfig } from '@layerzerolabs/lz-initia-cli'
import { Chain, chainAndStageToNetwork, Environment, Stage, EndpointVersion } from '@layerzerolabs/lz-definitions'
// import path from 'path'
import { MnemonicKey } from '@initia/initia.js'

const INITIA_SANDBOX_LOCAL = chainAndStageToNetwork(Chain.INITIA, Stage.SANDBOX, Environment.LOCAL)
const INITIA_TESTNET = chainAndStageToNetwork(Chain.INITIA, Stage.TESTNET, Environment.TESTNET)
const INITIA_MAINNET = chainAndStageToNetwork(Chain.INITIA, Stage.MAINNET, Environment.MAINNET)
// const contractWorkspace = './contracts'

const DEPLOYER_PATH = process.env.DEPLOYER_PATH
const DEPLOYER_MNEMONIC = process.env.DEPLOYER_MNEMONIC

if (!DEPLOYER_PATH || !DEPLOYER_MNEMONIC) {
    throw new Error('DEPLOYER_PATH and DEPLOYER_MNEMONIC must be set in environment variables')
}

console.log('DEPLOYER_PATH:', DEPLOYER_PATH)
const [, , COIN_TYPE, ACCOUNT, , INDEX] = DEPLOYER_PATH!.split('/')
const MNEMONIC_KEY = new MnemonicKey({
    mnemonic: DEPLOYER_MNEMONIC,
    account: parseInt(ACCOUNT!),
    index: parseInt(INDEX!),
    coinType: parseInt(COIN_TYPE!),
})

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
    // defaultDeployer: Account.fromPrivateKey({ privateKey: process.env.DEFAULT_DEPLOYER })
    gasPrice: {
        // [INITIA_SANDBOX_LOCAL]: '0.000004000',
        // [INITIA_TESTNET]: '10000',
        // [INITIA_MAINNET]: '0.000004000',
    },
    modules: {
        MyOFT: {
            modulePath: 'programs/oft',
            // addresses: {
            //     MyOFT: '_',
            // },
            deployer: {
                'initia-sandbox-local': MNEMONIC_KEY,
                'initia-testnet': MNEMONIC_KEY,
            },
        },
    },
}

export default config
