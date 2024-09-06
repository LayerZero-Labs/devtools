import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

import { oappIDPDA } from '@layerzerolabs/lz-solana-sdk-v2'

export const COUNT_SEED = 'Count'
export const REMOTE_SEED = 'Remote'
export const LZ_RECEIVE_TYPES_SEED = 'LzReceiveTypes'
export const LZ_COMPOSE_TYPES_SEED = 'LzComposeTypes'

export class OmniCounterPDADeriver {
    constructor(
        public readonly program: PublicKey,
        public counterId = 0
    ) {}

    count(): [PublicKey, number] {
        return oappIDPDA(this.program, COUNT_SEED, this.counterId)
    }

    remote(dstChainId: number): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from(REMOTE_SEED), this.count()[0].toBytes(), new BN(dstChainId).toArrayLike(Buffer, 'be', 4)],
            this.program
        )
    }

    lzReceiveTypesAccounts(): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from(LZ_RECEIVE_TYPES_SEED, 'utf8'), this.count()[0].toBytes()],
            this.program
        )
    }

    lzComposeTypesAccounts(): [PublicKey, number] {
        return PublicKey.findProgramAddressSync(
            [Buffer.from(LZ_COMPOSE_TYPES_SEED, 'utf8'), this.count()[0].toBytes()],
            this.program
        )
    }
}
