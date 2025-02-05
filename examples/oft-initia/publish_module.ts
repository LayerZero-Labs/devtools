import * as fs from 'fs'
import path from 'path'
import 'dotenv/config'

import { Coins, Fee, LCDClient, MsgPublish, RawKey, Wallet } from '@initia/initia.js'
import { glob } from 'glob'

async function publishModule() {
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

    // Read the module file
    const moduleDir = path.join(process.cwd(), 'build/oft/bytecode_modules')
    const moduleFile = path.join(moduleDir, 'new_get_next_object_address.mv')
    const codeBytes = fs.readFileSync(moduleFile)

    const msgs = [new MsgPublish(wallet.key.accAddress, [codeBytes.toString('base64')], 1)]

    try {
        const signedTx = await wallet.createAndSignTx({
            msgs,
            gasPrices: '2000uinit',
            gasAdjustment: '2.0',
            gas: '1000000',
            fee: new Fee(1000000, new Coins({ uinit: '1000000' })),
        })

        const result = await lcd.tx.broadcast(signedTx)
        console.log('Publication successful:', result)
    } catch (error) {
        console.error('Publication failed:', error)
    }
}

publishModule()
