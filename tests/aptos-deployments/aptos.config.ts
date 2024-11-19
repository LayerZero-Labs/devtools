// import { LzAptosConfig } from './src/types'
// import { Chain, chainAndStageToNetwork, Environment, Stage, EndpointVersion } from '@layerzerolabs/lz-definitions'
// import path from 'path'
// import { Account, Aptos, AptosConfig, Ed25519PrivateKey, Network, PrivateKey } from '@aptos-labs/ts-sdk'
// import dotenv from 'dotenv'
// dotenv.config()

// const APTOS_SANDBOX_LOCAL = chainAndStageToNetwork(Chain.APTOS, Stage.SANDBOX, Environment.LOCAL)
// // const APTOS_TESTNET = chainAndStageToNetwork(Chain.APTOS, Stage.TESTNET, Environment.TESTNET)
// // const APTOS_MAINNET = chainAndStageToNetwork(Chain.APTOS, Stage.MAINNET, Environment.MAINNET)
// const contractWorkspace = './node_modules/oft-aptos'

// function requireEnv(name: string): void {
//     const value = process.env[name]
//     if (!value) {
//         throw new Error(`Missing required environment variable: ${name}`)
//     }
// }

// requireEnv('LOCAL_DEPLOYER')
// requireEnv('TESTNET_DEPLOYER')
// requireEnv('MAINNET_DEPLOYER')
// requireEnv('LAYERZERO_DEPLOYER')
// requireEnv('EXECUTOR_DEPLOYER')

// const aptosConfig = new AptosConfig({
//     network: Network.CUSTOM,
//     fullnode: 'http://127.0.0.1:8080/v1',
//     indexer: 'http://127.0.0.1:8090/v1',
// })

// const rawPrivateKey = process.env.LOCAL_DEPLOYER as string
// const privateKey = new Ed25519PrivateKey(rawPrivateKey)
// const aptos = new Aptos(aptosConfig)
// const deployer = aptos.deriveAccountFromPrivateKey({ privateKey })

// const config: LzAptosConfig = {
//     artifactsPath: './artifacts',
//     deploymentPath: './deployments',
//     compatibleVersions: [EndpointVersion.V2],
//     network: {
//         'aptos-sandbox-local': {
//             url: 'http://127.0.0.1:8080/v1',
//         },
//     },
//     defaultDeployer: {
//         [APTOS_SANDBOX_LOCAL]: deployer,
//         // [APTOS_TESTNET]: Account.fromPrivateKey({
//         //     privateKey: process.env.TESTNET_DEPLOYER as unknown as PrivateKey,
//         // }),
//         // [APTOS_MAINNET]: Account.fromPrivateKey({
//         //     privateKey: process.env.MAINNET_DEPLOYER as unknown as PrivateKey,
//         // }),
//     },
//     // alternative way to set defaultDeployer
//     // defaultDeployer: Account.fromPrivateKey({ privateKey: process.env.DEFAULT_DEPLOYER })
//     // gasPrice: {
//     //     [APTOS_SANDBOX_LOCAL]: 1000,
//     //     [APTOS_TESTNET]: 1000,
//     //     [APTOS_MAINNET]: 1000,
//     // },
//     compileOptions: {
//         '--included-artifacts': 'all',
//     },
//     // baseModules: ['PATH_TO_ANOTHER_LZ_APTOS_CONFIG_FILE'],
//     modules: {
//         oft: {
//             modulePath: path.join(contractWorkspace, 'layerzero-common'),
//             deployer: {
//                 'aptos-sandbox-local': deployer,
//             },
//         },
//         // executor_v2: {
//         //     alias: 'ExecutorV2',
//         //     modulePath: path.join(contractWorkspace, 'executor/executor-v2'),
//         //     deployer: Account.fromPrivateKey({
//         //         privateKey: process.env.EXECUTOR_DEPLOYER as unknown as PrivateKey,
//         //     }),
//         // },
//         // executor_auth: {
//         //     modulePath: path.join(contractWorkspace, 'executor/executor-auth'),
//         //     variant: process.env.SUFFIX_EXECUTOR,
//         // },
//     },
// }

// export default config
