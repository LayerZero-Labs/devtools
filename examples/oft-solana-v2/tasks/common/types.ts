import { decode } from '@coral-xyz/anchor/dist/cjs/utils/bytes/bs58'
import { Keypair, PublicKey } from '@solana/web3.js'
import { CLIArgumentType } from 'hardhat/types'

export const keyPair: CLIArgumentType<Keypair> = {
    name: 'keyPair',
    parse(name: string, value: string) {
        return Keypair.fromSecretKey(decode(value))
    },
    validate() {},
}

export const publicKey: CLIArgumentType<PublicKey> = {
    name: 'keyPair',
    parse(name: string, value: string) {
        return new PublicKey(value)
    },
    validate() {},
}
