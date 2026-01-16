import fs from 'fs'
import path from 'path'

import { publicKey } from '@metaplex-foundation/umi'
import { utils } from '@noble/secp256k1'
import { Keypair } from '@solana/web3.js'

import { UMI } from '@layerzerolabs/lz-solana-sdk-v2'

export const SRC_EID = 50168
export const DST_EID = 50125
export const INVALID_EID = 999999 // Non-existent EID for testing
export const TON_EID = 50343

const DEFAULT_OFT_KEYPAIR = path.resolve(process.cwd(), 'target/deploy/oft-keypair.json')
const OFT_PROGRAM_ID_VALUE =
    process.env.OFT_ID ?? readKeypairPublicKey(DEFAULT_OFT_KEYPAIR) ?? '9UovNrJD8pQyBLheeHNayuG1wJSEAoxkmM14vw5gcsTT'
const ENDPOINT_PROGRAM_ID_VALUE = process.env.LZ_ENDPOINT_PROGRAM_ID ?? '76y77prsiCMvXMjuoZ5VRrhG5qYBrUMYTE5WgHqgjEn6'
const ULN_PROGRAM_ID_VALUE = process.env.LZ_ULN_PROGRAM_ID ?? '7a4WjyR8VZ7yZz5XJAKm39BUGn5iT9CKcv2pmG9tdXVH'
const EXECUTOR_PROGRAM_ID_VALUE = process.env.LZ_EXECUTOR_PROGRAM_ID ?? '6doghB248px58JSSwG4qejQ46kFMW4AMj7vzJnWZHNZn'
const PRICEFEED_PROGRAM_ID_VALUE = process.env.LZ_PRICEFEED_PROGRAM_ID ?? '8ahPGPjEbpgGaZx2NV1iG5Shj7TDwvsjkEDcGWjt94TP'
const DVN_PROGRAM_IDS_VALUE = (process.env.LZ_DVN_PROGRAM_IDS ?? 'HtEYV4xB4wvsj5fgTkcfuChYpvGYzgzwvNhgDZQNh7wW')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

export const OFT_PROGRAM_ID = publicKey(OFT_PROGRAM_ID_VALUE)

export const DVN_SIGNERS = new Array(4).fill(0).map(() => utils.randomPrivateKey())

export const OFT_DECIMALS = 6

export const defaultMultiplierBps = 12500 // 125%

export const endpoint: UMI.EndpointProgram.Endpoint = new UMI.EndpointProgram.Endpoint(ENDPOINT_PROGRAM_ID_VALUE)
export const uln: UMI.UlnProgram.Uln = new UMI.UlnProgram.Uln(ULN_PROGRAM_ID_VALUE)
export const executor: UMI.ExecutorProgram.Executor = new UMI.ExecutorProgram.Executor(EXECUTOR_PROGRAM_ID_VALUE)
export const priceFeed: UMI.PriceFeedProgram.PriceFeed = new UMI.PriceFeedProgram.PriceFeed(PRICEFEED_PROGRAM_ID_VALUE)

export const dvns = DVN_PROGRAM_IDS_VALUE.map((value) => publicKey(value))

function readKeypairPublicKey(keypairPath: string): string | undefined {
    if (!fs.existsSync(keypairPath)) {
        return undefined
    }

    try {
        const secret = JSON.parse(fs.readFileSync(keypairPath, 'utf-8')) as number[]
        const keypair = Keypair.fromSecretKey(Uint8Array.from(secret))
        return keypair.publicKey.toBase58()
    } catch (error) {
        console.warn(`Failed to read keypair at ${keypairPath}: ${String(error)}`)
        return undefined
    }
}
