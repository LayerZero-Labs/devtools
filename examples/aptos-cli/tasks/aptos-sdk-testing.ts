/* eslint-disable turbo/no-undeclared-env-vars */
import { Aptos, AptosConfig, Ed25519PrivateKey, Network } from '@aptos-labs/ts-sdk'
import 'dotenv/config'

const ACCOUNT_ADDRESS = '0x58b730d07e98a22f2b357bee721115c986e4dc873c1884763708ee3d4006f74e'

async function main() {
    const rawPrivateKey = process.env.APTOS_PRIVATE_KEY
    if (!rawPrivateKey) {
        throw new Error('APTOS_PRIVATE_KEY environment variable is not set')
    }

    const config = new AptosConfig({
        network: Network.CUSTOM,
        fullnode: 'http://127.0.0.1:8080/v1',
        indexer: 'http://127.0.0.1:8090/v1',
    })

    // Aptos is the main entrypoint for all functions
    const aptos = new Aptos(config)

    const myAccount = await aptos.getAccountInfo({ accountAddress: ACCOUNT_ADDRESS })
    console.log('Account Info:\n', myAccount)
    const modules = await aptos.getAccountModules({
        accountAddress: ACCOUNT_ADDRESS,
    })
    console.log('Account Address: ', ACCOUNT_ADDRESS)

    console.log('Account Modules:\n', modules)
    console.log(modules[0])
    console.log(modules[0].abi?.exposed_functions)

    const aptosFunction =
        `${ACCOUNT_ADDRESS}::${modules[0].abi?.name}::${modules[0].abi?.exposed_functions[1].name}` as const
    console.log('Aptos Function: ', aptosFunction)

    const txn = await aptos.transaction.build.simple({
        sender: ACCOUNT_ADDRESS,
        data: {
            function: aptosFunction,
            functionArguments: ['some text'],
        },
    })
    console.log('txn:\n', txn)

    const privateKey = new Ed25519PrivateKey(rawPrivateKey)

    const account = await aptos.deriveAccountFromPrivateKey({ privateKey })

    const committedTxn = await aptos.signAndSubmitTransaction({
        signer: account,
        transaction: txn,
    })
    console.log('Committed Transaction:\n', committedTxn)
}

// Run the async function
main().catch(console.error)
