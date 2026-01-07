import { describe, it, before } from 'mocha'
import { Context, Umi } from '@metaplex-foundation/umi'
import assert from 'assert'

import { getGlobalContext, getGlobalKeys, getGlobalUmi } from '../index.test'
import { expectOftError, quoteOft, quoteSend } from '../helpers'
import { DST_EID, OFT_DECIMALS } from '../constants'
import { oft } from '@layerzerolabs/oft-v2-solana-sdk'
import { OftKeySets, TestContext } from '../types'

describe('quote instructions', function () {
    this.timeout(300000)

    let context: TestContext
    let umi: Umi | Context
    let keys: OftKeySets

    before(() => {
        context = getGlobalContext()
        umi = getGlobalUmi()
        keys = getGlobalKeys()
    })

    ;(['native', 'adapter'] as const).forEach((keyLabel) => {
        describe(`${keyLabel} quotes`, () => {
            it('rejects slippage when min amount exceeds computed amount', async () => {
                const keySet = keys[keyLabel]
                const sendAmount = BigInt(2 * 10 ** OFT_DECIMALS)
                const minAmount = BigInt(3 * 10 ** OFT_DECIMALS)

                await expectOftError(
                    async () =>
                        quoteSend(
                            context,
                            keySet,
                            keySet.oappAdmin,
                            keySet.oappAdmin.publicKey,
                            DST_EID,
                            sendAmount,
                            minAmount
                        ),
                    oft.errors.SlippageExceededError,
                    context.program
                )
            })

            it('returns quoteSend and quoteOft results', async () => {
                const keySet = keys[keyLabel]
                const sendAmount = BigInt(10 * 10 ** OFT_DECIMALS)

                const quote = await quoteSend(
                    context,
                    keySet,
                    keySet.oappAdmin,
                    keySet.oappAdmin.publicKey,
                    DST_EID,
                    sendAmount
                )
                assert.ok(quote.nativeFee >= 0n)

                const oftQuote = await quoteOft(
                    context,
                    keySet,
                    keySet.oappAdmin,
                    keySet.oappAdmin.publicKey,
                    DST_EID,
                    sendAmount
                )
                assert.strictEqual(oftQuote.oftReceipt.amountSentLd, sendAmount)
            })
        })
    })
})
