import { Pda, PublicKey, publicKeyBytes } from '@metaplex-foundation/umi'
import { Endian, u32 } from '@metaplex-foundation/umi/serializers'
import { createWeb3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js'

import { OmniAppPDA } from '@layerzerolabs/lz-solana-sdk-v2/umi'

const eddsa = createWeb3JsEddsa()

export class MyOAppPDA extends OmniAppPDA {
    static STORE_SEED = 'Store'
    static NONCE_SEED = 'Nonce'

    constructor(public readonly programId: PublicKey) {
        super(programId)
    }

    // seeds = [STORE_SEED],
    oapp(): Pda {
        return eddsa.findPda(this.programId, [Buffer.from(MyOAppPDA.STORE_SEED, 'utf8')])
    }

    // seeds = [PEER_SEED, &count.key().to_bytes(), &params.dst_eid.to_be_bytes()],
    peer(dstChainId: number): Pda {
        const [count] = this.oapp()
        return eddsa.findPda(this.programId, [
            Buffer.from(OmniAppPDA.PEER_SEED, 'utf8'),
            publicKeyBytes(count),
            u32({ endian: Endian.Big }).serialize(dstChainId),
        ])
    }

    // seeds = [NONCE_SEED, &params.receiver, &params.src_eid.to_be_bytes(), &params.sender]
    nonce(receiver: PublicKey, remoteEid: number, sender: Uint8Array): Pda {
        return eddsa.findPda(this.programId, [
            Buffer.from(MyOAppPDA.NONCE_SEED, 'utf8'),
            publicKeyBytes(receiver),
            u32({ endian: Endian.Big }).serialize(remoteEid),
            sender,
        ])
    }
}
