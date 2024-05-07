import fc from 'fast-check'
import { EndpointId, Stage } from '@layerzerolabs/lz-definitions'
import { BIP39_WORDLIST, ENDPOINT_IDS } from './constants'
import { entropyToMnemonic } from '@scure/bip39'

export const nullishArbitrary = fc.constantFrom(null, undefined)

export const undefinedArbitrary = fc.constantFrom(undefined)

export const nullableArbitrary = <T>(a: fc.Arbitrary<T>) => fc.oneof(a, nullishArbitrary)

export const optionalArbitrary = <T>(a: fc.Arbitrary<T>) => fc.oneof(a, undefinedArbitrary)

export const addressArbitrary = fc.string()

export const evmAddressArbitrary = fc.hexaString({ minLength: 40, maxLength: 40 }).map((address) => `0x${address}`)

export const evmBytes32Arbitrary = fc.hexaString({ minLength: 64, maxLength: 64 }).map((address) => `0x${address}`)

export const endpointArbitrary: fc.Arbitrary<EndpointId> = fc.constantFrom(...ENDPOINT_IDS)

export const stageArbitrary: fc.Arbitrary<Stage> = fc.constantFrom(Stage.MAINNET, Stage.TESTNET, Stage.SANDBOX)

export const mnemonicArbitrary: fc.Arbitrary<string> = fc
    .uint8Array({ minLength: 16, maxLength: 16 })
    .map((entropy) => entropyToMnemonic(entropy, BIP39_WORDLIST))

export const pointArbitrary = fc.record({
    eid: endpointArbitrary,
    address: evmAddressArbitrary,
    contractName: nullableArbitrary(fc.string()),
})

export const vectorArbitrary = fc.record({
    from: pointArbitrary,
    to: pointArbitrary,
})
