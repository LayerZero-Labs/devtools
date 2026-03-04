import { decode } from '@coral-xyz/anchor/dist/cjs/utils/bytes/bs58'
import { Keypair, PublicKey } from '@solana/web3.js'
import { CLIArgumentType } from 'hardhat/types'

export const keyPair: CLIArgumentType<Keypair> = {
    name: 'keyPair',
    parse(name: string, value: string) {
        return Keypair.fromSecretKey(decode(value))
    },
    validate(name: string, value: unknown) {
        if (!(value instanceof Keypair)) {
            throw new Error(`${name} is not a valid Keypair`)
        }
    },
}

export const publicKey: CLIArgumentType<PublicKey> = {
    name: 'keyPair',
    parse(name: string, value: string) {
        return new PublicKey(value)
    },
    validate(name: string, value: unknown) {
        if (!(value instanceof PublicKey)) {
            throw new Error(`${name} is not a valid PublicKey`)
        }
    },
}

export interface SendResult {
    txHash: string // EVM: receipt.transactionHash, Solana: base58 sig
    scanLink: string // LayerZeroScan link for cross-chain tracking
}
