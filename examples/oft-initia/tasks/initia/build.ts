// /* eslint-disable turbo/no-undeclared-env-vars */
// import { RESTClient, MnemonicKey, Wallet } from '@initia/initia.js'
// import 'dotenv/config'

// async function checkBalance() {
//     const rest = new RESTClient('https://rest.testnet.initia.xyz', {
//         chainId: 'initiation-2',
//         gasPrices: '0.15uinit',
//         gasAdjustment: '1.75',
//     })

//     const DEPLOYER_PATH = process.env.DEPLOYER_PATH
//     const DEPLOYER_MNEMONIC = process.env.DEPLOYER_MNEMONIC

//     const [, , COIN_TYPE, ACCOUNT, , INDEX] = DEPLOYER_PATH!.split('/')
//     const key = new MnemonicKey({
//         mnemonic: DEPLOYER_MNEMONIC,
//         account: parseInt(ACCOUNT!),
//         index: parseInt(INDEX!),
//         coinType: parseInt(COIN_TYPE!),
//     })

//     const wallet = new Wallet(rest, key)

//     try {
//         const address = wallet.key.accAddress

//         const balances = await rest.bank.balance(address)

//         console.log('Wallet Address:', address)
//         console.log('Balances:', balances.toString())
//     } catch (error) {
//         console.error('Error fetching balance:', error)
//     }
// }

// checkBalance()

import { MoveBuilder } from '@initia/builder.js'

const path = './sources'

async function buildModule() {
    const builder = new MoveBuilder(path, {})
    await builder.build()
}

buildModule()
