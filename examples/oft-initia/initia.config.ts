/* eslint-disable turbo/no-undeclared-env-vars */
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
    // 2: config.network[env] - - env is retrieved from network + endpointversion
    network: {
        [Environment.LOCAL]: 'http://127.0.0.1:8080',
        [Environment.TESTNET]: 'https://lcd.initiation-2.initia.xyz',
    },
    // 4: deployer calls default deployer
    defaultDeployer: {
        [INITIA_SANDBOX_LOCAL]: MNEMONIC_KEY,
        [INITIA_TESTNET]: MNEMONIC_KEY,
        [INITIA_MAINNET]: MNEMONIC_KEY,
    },
    // alternative way to set defaultDeployer
    // defaultDeployer: Account.fromPrivateKey({ privateKey: process.env.DEFAULT_DEPLOYER })
    gasPrice: {
        // [INITIA_SANDBOX_LOCAL]: '0.000004000',
        // [INITIA_TESTNET]: '10000',
        // [INITIA_MAINNET]: '0.000004000',
    },
    // 3: baseModules: i think this is the path to the other modules that are needed for the deployment
    // baseModules: ['PATH_TO_ANOTHER_LZ_INITIA_CONFIG_FILE'],
    // 5: getMoveContext uses modules.add
    modules: {
        //     // 1: lzInitiaConfig.modules[moduleName] gets module that should be deployed
        //     // layerzero_common: {
        MyOFT: {
            modulePath: 'programs/oft', // 6: modulePath is the path to the file
            addresses: {
                MyOFT: '_',
            },
            deployer: {
                'initia-sandbox-local': MNEMONIC_KEY,
                'initia-testnet': MNEMONIC_KEY,
            },
        },
        //     Memecoin: {
        //         modulePath: 'programs/memecoin',
        //         addresses: {
        //             Memecoin: '_',
        //         },
        //     },
    },
}

export default config

// Config
// export interface LzInitiaConfig {
//     artifactsPath: string
//     deploymentPath: string
//     compatibleVersions?: EndpointVersion[]
//     network?: { [key in Environment]?: ProviderSetting }
//     defaultDeployer?:
//         | {
//               [network in Network]?: MnemonicKey
//           }
//         | MnemonicKey
//     gasPrice?: {
//         [network in Network]?: number
//     }
//     compileOptions?: CmdOptions
//     baseModules?: string[]
//     modules: {
//         [key in string]?: {
//             alias?: string
//             variant?: string
//             modulePath: string
//             deployer?:
//                 | {
//                       [network in Network]?: MnemonicKey
//                   }
//                 | MnemonicKey
//             addresses?: {
//                 [key in string]:
//                     | {
//                           [network in Network]?: string
//                       }
//                     | string
//             }
//             compileOptions?: CmdOptions
//         }
//     }
// }

// const lzInitiaConfig = {
//     modules: {
//         "endpoint": {
//             modulePath: "./endpoint",
//             addresses: {
//                 // Direct string assignment
//                 "admin": "0x123abc...",  // A specific admin account address

//                 // Network-specific addresses
//                 "endpoint": {
//                     "testnet": "0x789def...",
//                     "mainnet": "0x456xyz..."
//                 }
//             }
//         }
//     }
// }
