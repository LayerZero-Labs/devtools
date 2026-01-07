import { UMI } from '@layerzerolabs/lz-solana-sdk-v2'
import { OftPDA } from '@layerzerolabs/oft-v2-solana-sdk'
import {
    AddressLookupTableInput,
    Context,
    KeypairSigner,
    Program,
    ProgramRepositoryInterface,
    PublicKey,
} from '@metaplex-foundation/umi'
import { Connection } from '@solana/web3.js'

export type PacketSentEvent = UMI.EndpointProgram.events.PacketSentEvent

export interface TestContext {
    umi: Context
    connection: Connection
    executor: KeypairSigner
    program: Program
    programRepo: ProgramRepositoryInterface
    pda: OftPDA
    lookupTable?: AddressLookupTableInput
    keys?: OftKeySets
}

export interface OftKeySets {
    native: OftKeys
    adapter: OftKeys
}

export interface OftKeys {
    escrow: KeypairSigner
    mint: KeypairSigner
    tokenMintAuthority: PublicKey
    oappAdmin: KeypairSigner
    oappAdminTokenAccount?: PublicKey
    oftStore: PublicKey
    delegate: KeypairSigner
    pauser: KeypairSigner
    unpauser: KeypairSigner
}
