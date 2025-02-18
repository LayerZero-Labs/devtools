import { beginCell, Cell, external, internal, Message, WalletContractV3R2 } from '@ton/ton'
import { KeyPair, mnemonicToWalletKey } from '@ton/crypto'
import fc from 'fast-check'
import {
    deserialize,
    deserializeMessage,
    deserializeMessageRelaxed,
    deserializeMessagesRelaxed,
    messageRelaxedToCell,
    messageToCell,
    serializeMessage,
    serializeMessageRelaxed,
    serializeMessagesRelaxed,
} from '@/transactions/serde'

describe('transactions/serde', () => {
    const mnemonic = 'test test test test test test test test test test test junk'

    let keyPair: KeyPair
    let wallet: WalletContractV3R2

    const cellArbitrary: fc.Arbitrary<Cell> = fc.oneof(
        fc.boolean().map((bit) => beginCell().storeBit(bit).endCell()),
        fc.integer({ min: 0, max: 255 }).map((int) => beginCell().storeInt(int, 9).endCell())
    )

    beforeEach(async () => {
        keyPair = await mnemonicToWalletKey(mnemonic.split(' '))
        wallet = WalletContractV3R2.create({ workchain: 0, publicKey: keyPair.publicKey, walletId: 42 })
    })

    afterEach(() => {
        keyPair = undefined!
        wallet = undefined!
    })

    describe('serializeMessageRelaxed/deserializeMessageRelaxed', () => {
        it('should serialize an internal message', () => {
            fc.assert(
                fc.property(fc.bigInt({ min: 0n, max: 1000n }), fc.boolean(), cellArbitrary, (value, bounce, body) => {
                    const messageRelaxed = internal({
                        value,
                        to: wallet.address,
                        bounce,
                        body,
                    })

                    const serialized = serializeMessageRelaxed(messageRelaxed)
                    const deserialized = deserializeMessageRelaxed(serialized)

                    // FIXME Jest comparison operators don't work well with message objects
                    // so a workaround expectation is used
                    //
                    // See https://github.com/ton-core/ton-core/blob/e0ed819973daf0484dfbacd0c30a0dcfe4714f8d/src/types/MessageRelaxed.spec.ts
                    expect(Cell.fromBase64(serialized).equals(messageRelaxedToCell(messageRelaxed))).toBeTruthy()

                    const reserialized = serializeMessageRelaxed(deserialized)
                    expect(reserialized).toEqual(serialized)
                })
            )
        })
    })

    describe('serializeMessage/deserializeMessage', () => {
        it('should serialize an external message', () => {
            fc.assert(
                fc.property(cellArbitrary, (body) => {
                    const message = external({
                        to: wallet.address,
                        body,
                    })

                    const serialized = serializeMessage(message)
                    const deserialized = deserializeMessage(serialized)

                    // FIXME Jest comparison operators don't work well with message objects
                    // so a workaround expectation is used
                    //
                    // See https://github.com/ton-core/ton-core/blob/e0ed819973daf0484dfbacd0c30a0dcfe4714f8d/src/types/MessageRelaxed.spec.ts
                    expect(Cell.fromBase64(serialized).equals(messageToCell(message))).toBeTruthy()

                    const reserialized = serializeMessage(deserialized)
                    expect(reserialized).toEqual(serialized)
                })
            )
        })
    })

    describe('serializeMessage/deserialize', () => {
        it('should serialize an external message', () => {
            fc.assert(
                fc.property(cellArbitrary, (body) => {
                    const message = external({
                        to: wallet.address,
                        body,
                    })

                    const serialized = serializeMessage(message)
                    const deserialized = deserialize(serialized)

                    // FIXME Jest comparison operators don't work well with message objects
                    // so a workaround expectation is used
                    //
                    // See https://github.com/ton-core/ton-core/blob/e0ed819973daf0484dfbacd0c30a0dcfe4714f8d/src/types/MessageRelaxed.spec.ts
                    expect(Cell.fromBase64(serialized).equals(messageToCell(message))).toBeTruthy()

                    const reserialized = serializeMessage(deserialized as Message)
                    expect(reserialized).toEqual(serialized)
                })
            )
        })
    })

    describe('serializeMessageRelaxed/deserialize', () => {
        it('should serialize an internal message', () => {
            fc.assert(
                fc.property(fc.bigInt({ min: 0n, max: 1000n }), fc.boolean(), cellArbitrary, (value, bounce, body) => {
                    const messageRelaxed = internal({
                        value,
                        to: wallet.address,
                        bounce,
                        body,
                    })

                    const serialized = serializeMessageRelaxed(messageRelaxed)
                    const deserialized = deserialize(serialized)

                    // FIXME Jest comparison operators don't work well with message objects
                    // so a workaround expectation is used
                    //
                    // See https://github.com/ton-core/ton-core/blob/e0ed819973daf0484dfbacd0c30a0dcfe4714f8d/src/types/MessageRelaxed.spec.ts
                    expect(Cell.fromBase64(serialized).equals(messageRelaxedToCell(messageRelaxed))).toBeTruthy()

                    const reserialized = serializeMessage(deserialized as Message)
                    expect(reserialized).toEqual(serialized)
                })
            )
        })
    })

    describe('serializeMessagesRelaxed', () => {
        it('should serialize and deserialize an array of internal messages', () => {
            fc.assert(
                fc.property(fc.bigInt({ min: 0n, max: 1000n }), fc.boolean(), cellArbitrary, (value, bounce, body) => {
                    const messageRelaxed = internal({
                        value,
                        to: wallet.address,
                        bounce,
                        body,
                    })
                    const messageRelaxed2 = internal({
                        value,
                        to: wallet.address,
                        bounce,
                        body,
                    })

                    const serialized = serializeMessagesRelaxed([messageRelaxed, messageRelaxed2])
                    const deserialized = deserializeMessagesRelaxed(serialized)

                    // FIXME Jest comparison operators don't work well with message objects
                    // so a workaround expectation is used
                    //
                    // See https://github.com/ton-core/ton-core/blob/e0ed819973daf0484dfbacd0c30a0dcfe4714f8d/src/types/MessageRelaxed.spec.ts
                    const serializedData = serialized.split(',')
                    expect(
                        Cell.fromBase64(serializedData[0]!).equals(messageRelaxedToCell(messageRelaxed))
                    ).toBeTruthy()
                    expect(
                        Cell.fromBase64(serializedData[1]!).equals(messageRelaxedToCell(messageRelaxed2))
                    ).toBeTruthy()

                    const reserialized = serializeMessagesRelaxed(deserialized)
                    expect(reserialized).toEqual(serialized)
                })
            )
        })
    })

    describe('deserialize', () => {
        it('should throw if passed an invalid message', () => {
            fc.assert(
                fc.property(fc.base64String(), (serialized) => {
                    expect(() => deserialize(serialized)).toThrow(/Failed to deserialize data./)
                })
            )
        })
    })
})
