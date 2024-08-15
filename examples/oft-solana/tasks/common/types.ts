import { Keypair, PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'
import { CLIArgumentType } from 'hardhat/types'

export const keyPair: CLIArgumentType<Keypair> = {
    name: 'keyPair',
    parse(name: string, value: string) {
        return Keypair.fromSecretKey(bs58.decode(value))
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
