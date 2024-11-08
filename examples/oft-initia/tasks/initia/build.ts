// import { build } from '@layerzerolabs/lz-initia-cli'
// import { Command, createOption } from '@commander-js/extra-typings'

// import { Network } from '@layerzerolabs/lz-definitions'

// import { LzInitiaConfig } from '@layerzerolabs/lz-initia-cli'

// const command = new Command()

// export { command }

// command
//     .name('build')
//     .description('build Initia program')
//     .addOption(createOption('-m, --modules <modules...>', 'modules').makeOptionMandatory(true))
//     .addOption(
//         createOption(
//             '-p, --module-paths <paths...>',
//             'module paths of modules, use the path in lz-initia.config.ts if not specify'
//         ).makeOptionMandatory(false)
//     )
//     .addOption(createOption('-n, --network <network>', 'network').makeOptionMandatory(true))
//     .addOption(createOption('-v, --variant <variant>', 'variant').makeOptionMandatory(false))
//     .addOption(createOption('-sb, --skip-build', 'skip build').default(false))
//     .action(
//         async (
//             options: {
//                 network: string
//                 modules: string[]
//                 modulePaths?: string[]
//                 variant?: string
//                 skipBuild: boolean
//             },
//             cmd
//         ) => {

//             // const context = cmd.getOptionValue('__CONTEXT__') as LzInitiaConfig
//             // const { skipBuild, modules, network, variant, modulePaths } = options
//             // // replace the modulePath in context with the modulePaths from command line
//             // console.log('Module paths:', modulePaths);
//             // if (modulePaths !== undefined) {
//             //     for (let i = 0; i < modulePaths.length; i++) {
//             //         const module = modules[i]
//             //         const moduleConfig = context.modules[module]
//             //         if (moduleConfig !== undefined) {
//             //             moduleConfig.modulePath = modulePaths[i]
//             //         }
//             //     }
//             // }
//             // for (const module of modules) {
//             //     console.log('Building module:', module);
//             //     console.log('Context:', context);
//             //     console.log('Network:', network);
//             //     console.log('Skip build:', skipBuild);
//             //     console.log('Variant:', variant ?? context.modules[module]?.variant);

//             //     await build(module, context, network as Network, skipBuild, variant ?? context.modules[module]?.variant)
//             // }
//         }
//     )

// // /* eslint-disable turbo/no-undeclared-env-vars */
// // import { RESTClient, MnemonicKey, Wallet } from '@initia/initia.js'
// // import 'dotenv/config'

// // async function checkBalance() {
// //     const rest = new RESTClient('https://rest.testnet.initia.xyz', {
// //         chainId: 'initiation-2',
// //         gasPrices: '0.15uinit',
// //         gasAdjustment: '1.75',
// //     })

// //     const DEPLOYER_PATH = process.env.DEPLOYER_PATH
// //     const DEPLOYER_MNEMONIC = process.env.DEPLOYER_MNEMONIC

// //     const [, , COIN_TYPE, ACCOUNT, , INDEX] = DEPLOYER_PATH!.split('/')
// //     const key = new MnemonicKey({
// //         mnemonic: DEPLOYER_MNEMONIC,
// //         account: parseInt(ACCOUNT!),
// //         index: parseInt(INDEX!),
// //         coinType: parseInt(COIN_TYPE!),
// //     })

// //     const wallet = new Wallet(rest, key)

// //     try {
// //         const address = wallet.key.accAddress

// //         const balances = await rest.bank.balance(address)

// //         console.log('Wallet Address:', address)
// //         console.log('Balances:', balances.toString())
// //     } catch (error) {
// //         console.error('Error fetching balance:', error)
// //     }
// // }

// // checkBalance()

// // import { MoveBuilder } from '@initia/builder.js'

// // const path = './sources'

// // async function buildModule() {
// //     const builder = new MoveBuilder(path, {})
// //     await builder.build()
// // }

// // buildModule()
