import { publicKey } from '@metaplex-foundation/umi'
import { utils } from '@noble/secp256k1'
import { UMI } from '@layerzerolabs/lz-solana-sdk-v2'

export const SRC_EID = 50168
export const DST_EID = 50125
export const INVALID_EID = 999999 // Non-existent EID for testing
export const TON_EID = 50343

export const OFT_PROGRAM_ID = publicKey('9UovNrJD8pQyBLheeHNayuG1wJSEAoxkmM14vw5gcsTT')

export const DVN_SIGNERS = new Array(4).fill(0).map(() => utils.randomPrivateKey())

export const OFT_DECIMALS = 6

export const defaultMultiplierBps = 12500 // 125%

export const simpleMessageLib: UMI.SimpleMessageLibProgram.SimpleMessageLib =
    new UMI.SimpleMessageLibProgram.SimpleMessageLib(UMI.SimpleMessageLibProgram.SIMPLE_MESSAGELIB_PROGRAM_ID)

export const endpoint: UMI.EndpointProgram.Endpoint = new UMI.EndpointProgram.Endpoint(
    UMI.EndpointProgram.ENDPOINT_PROGRAM_ID
)
export const uln: UMI.UlnProgram.Uln = new UMI.UlnProgram.Uln(UMI.UlnProgram.ULN_PROGRAM_ID)
export const executor: UMI.ExecutorProgram.Executor = new UMI.ExecutorProgram.Executor(
    UMI.ExecutorProgram.EXECUTOR_PROGRAM_ID
)
export const priceFeed: UMI.PriceFeedProgram.PriceFeed = new UMI.PriceFeedProgram.PriceFeed(
    UMI.PriceFeedProgram.PRICEFEED_PROGRAM_ID
)

export const dvns = [publicKey('HtEYV4xB4wvsj5fgTkcfuChYpvGYzgzwvNhgDZQNh7wW')]
