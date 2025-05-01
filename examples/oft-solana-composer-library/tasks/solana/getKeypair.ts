import fs from 'fs'

import bs58 from 'bs58'
import { task, types } from 'hardhat/config'
/**
 * New helper task: decode a base58‐encoded Solana secret key into its raw byte array.
 */
task('decode-key', 'Decode a Base58‐encoded Solana secret key and print the raw byte array as JSON')
    .addParam('secret', 'Base58-encoded secret key', undefined, types.string)
    .addOptionalParam('out', 'Output file path', 'decoded-key.json', types.string)
    .setAction(async ({ secret, out }: { secret: string; out: string }) => {
        const bytes = bs58.decode(secret)
        const arr = Array.from(bytes)
        fs.writeFileSync(out, JSON.stringify(arr, null, 2))
        console.log(`Wrote ${arr.length} bytes to ${out}`)
    })
