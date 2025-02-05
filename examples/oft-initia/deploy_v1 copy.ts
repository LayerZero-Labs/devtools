import fs from 'fs'
import path from 'path'

import 'dotenv/config'

import { LCDClient, MsgExecute, MsgPublish, RawKey, Wallet, bcs } from '@initia/initia.js'
import { glob } from 'glob'

async function deployModules(lcd: LCDClient, wallet: Wallet, objectDeployerAddress: string) {
    // 1. Read all .mv files from ./build/bytecode_modules/
    const moduleDir = path.join(process.cwd(), 'build/oft/bytecode_modules')
    const mvNames: string[] = glob.sync('*.mv', { cwd: moduleDir })
    const moduleBuffers = mvNames.map((moduleName) => fs.readFileSync(path.join(moduleDir, moduleName)))

    console.log(`Found ${mvNames.length} modules to deploy at ${moduleDir}:`, mvNames)

    // 2. Prepare deployment arguments
    const modulesArg = bcs.vector(bcs.vector(bcs.u8())).serialize(moduleBuffers).toBase64()

    for (const mvName of mvNames) {
        const codeBytes = fs.readFileSync(path.join(moduleDir, mvName))
        const msgs = [new MsgPublish(wallet.key.accAddress, [codeBytes.toString('base64')], 1)]
        const signedTx = await wallet.createAndSignTx({ msgs })
    }

    // 3. Create and send transaction
    const msg = new MsgExecute(
        wallet.key.accAddress,
        objectDeployerAddress,
        'object_code_deployment',
        'publish_v2',
        [],
        [modulesArg]
    )

    const signedTx = await wallet.createAndSignTx({ msgs: [msg] })
    const tx = await lcd.tx.broadcast(signedTx)

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

    // Replace with your object deployer address
    const objectDeployerAddress = '0x1'

    try {
        const tx = await deployModules(lcd, wallet, objectDeployerAddress)
        console.log('Deployment successful:', tx.txhash)
    } catch (error) {
        console.error('Deployment failed:', error)
    }
}

main()
