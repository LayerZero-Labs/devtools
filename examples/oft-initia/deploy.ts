import fs from 'fs'
import path from 'path'

import 'dotenv/config'

import { Coins, Fee, LCDClient, MsgExecute, RawKey, Wallet, bcs } from '@initia/initia.js'
import { glob } from 'glob'

async function deployModules(lcd: LCDClient, wallet: Wallet) {
    // 1. Read all .mv files from ./build/bytecode_modules/
    const moduleDir = path.join(process.cwd(), 'build/oft/bytecode_modules')
    const mvNames: string[] = glob.sync('*.mv', { cwd: moduleDir })
    const moduleBuffers = mvNames.map((moduleName) => fs.readFileSync(path.join(moduleDir, moduleName)))

    console.log(`Found ${mvNames.length} modules to deploy at ${moduleDir}:`, mvNames)
    // Add this before deployment to see the hex address

    // 2. Prepare deployment arguments
    const modulesArg = bcs.vector(bcs.vector(bcs.u8())).serialize(moduleBuffers).toBase64()
    console.log('accAddress', wallet.key.accAddress)
    // 3. Create and send transaction
    const msg = new MsgExecute(wallet.key.accAddress, '0x1', 'object_code_deployment', 'publish_v2', [], [modulesArg])

    const signedTx = await wallet.createAndSignTx({
        msgs: [msg],
        gasPrices: '2000uinit', // Increase gas price
        gasAdjustment: '2.0', // Double gas adjustment
        gas: '1000000',
        fee: new Fee(1000000, new Coins({ uinit: '1000000' })),
    })
    const tx = await lcd.tx.broadcast(signedTx)

    // Check if the module was deployed successfully
    const info = await lcd.tx.txInfo(tx.txhash)
    console.log('info', info)

    return tx
}

// Usage example:
async function main() {
    const lcd = new LCDClient('https://lcd.testnet.initia.xyz', {
        chainId: 'initiation-2',
        gasPrices: '0.15uinit',
        gasAdjustment: '1.5',
    })

    if (!process.env.INITIA_PRIVATE_KEY) {
        throw new Error('INITIA_PRIVATE_KEY is not set')
    }

    const privateKey = RawKey.fromHex(process.env.INITIA_PRIVATE_KEY)
    const wallet = new Wallet(lcd, privateKey)

    try {
        const tx = await deployModules(lcd, wallet)
        console.log('Deployment successful:', tx.txhash)
    } catch (error) {
        console.error('Deployment failed:', error)
    }
}

main()
