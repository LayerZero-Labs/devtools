import { describe, it, before } from 'mocha'
import { Context, generateSigner, PublicKey, sol, Umi } from '@metaplex-foundation/umi'
import { fetchToken } from '@metaplex-foundation/mpl-toolbox'
import assert from 'assert'

import { getGlobalContext, getGlobalKeys, getGlobalUmi } from '../index.test'
import { expectOftError, quoteOft, quoteSend, send } from '../helpers'
import { DST_EID, OFT_DECIMALS } from '../constants'
import { sendAndConfirm } from '../utils'
import { oft } from '@layerzerolabs/oft-v2-solana-sdk'
import { OftKeySets, TestContext } from '../types'

const SEND_AMOUNT = BigInt(100 * 10 ** OFT_DECIMALS)

describe('withdraw_fee', function () {
    this.timeout(300000)

    let context: TestContext
    let umi: Umi | Context
    let keys: OftKeySets

    before(async function () {
        context = getGlobalContext()
        umi = getGlobalUmi()
        keys = getGlobalKeys()
    })

    ;(['native', 'adapter'] as const).forEach((keyLabel) => {
        describe(`${keyLabel} fee withdrawal`, () => {
            it('rejects unauthorized fee withdrawal', async () => {
                const { program } = context
                const keySet = keys[keyLabel]
                const invalidSender = generateSigner(umi)
                await umi.rpc.airdrop(invalidSender.publicKey, sol(1))

                const ix = oft.withdrawFee(
                    {
                        admin: invalidSender,
                        mint: keySet.mint.publicKey,
                        escrow: keySet.escrow.publicKey,
                        dest: keySet.oappAdminTokenAccount as PublicKey,
                    },
                    1n,
                    { oft: context.program.publicKey }
                )

                await expectOftError(
                    async () => sendAndConfirm(umi, ix, invalidSender),
                    oft.errors.UnauthorizedError,
                    program
                )
            })

            it('rejects withdrawal above available fees', async () => {
                const { program } = context
                const keySet = keys[keyLabel]
                if (!keySet.oappAdminTokenAccount) {
                    throw new Error('Missing admin token account for fee withdrawal')
                }

                const fee = await quoteSend(
                    context,
                    keySet,
                    keySet.oappAdmin,
                    keySet.oappAdmin.publicKey,
                    DST_EID,
                    SEND_AMOUNT
                )

                await send(
                    context,
                    keySet,
                    keySet.oappAdmin,
                    keySet.oappAdminTokenAccount,
                    keySet.oappAdmin.publicKey,
                    DST_EID,
                    SEND_AMOUNT,
                    fee
                )

                const oftStore = await oft.accounts.fetchOFTStore(umi, keySet.oftStore)
                const escrowBalance = await fetchToken(umi, keySet.escrow.publicKey)
                const availableFee = escrowBalance.amount - oftStore.tvlLd

                const ix = oft.withdrawFee(
                    {
                        admin: keySet.oappAdmin,
                        mint: keySet.mint.publicKey,
                        escrow: keySet.escrow.publicKey,
                        dest: keySet.oappAdminTokenAccount,
                    },
                    availableFee + 1n,
                    { oft: context.program.publicKey }
                )

                await expectOftError(
                    async () => sendAndConfirm(umi, ix, keySet.oappAdmin),
                    oft.errors.InvalidFeeError,
                    program
                )
            })

            it('withdraws available fees', async () => {
                const keySet = keys[keyLabel]
                if (!keySet.oappAdminTokenAccount) {
                    throw new Error('Missing admin token account for fee withdrawal')
                }

                const fee = await quoteSend(
                    context,
                    keySet,
                    keySet.oappAdmin,
                    keySet.oappAdmin.publicKey,
                    DST_EID,
                    SEND_AMOUNT
                )
                const quote = await quoteOft(
                    context,
                    keySet,
                    keySet.oappAdmin,
                    keySet.oappAdmin.publicKey,
                    DST_EID,
                    SEND_AMOUNT
                )
                const amountSentLd = quote.oftReceipt.amountSentLd
                const amountReceivedLd = quote.oftReceipt.amountReceivedLd
                const oftFeeLd = amountSentLd - amountReceivedLd

                await send(
                    context,
                    keySet,
                    keySet.oappAdmin,
                    keySet.oappAdminTokenAccount,
                    keySet.oappAdmin.publicKey,
                    DST_EID,
                    SEND_AMOUNT,
                    fee
                )

                const oftStore = await oft.accounts.fetchOFTStore(umi, keySet.oftStore)
                const escrowBalance = await fetchToken(umi, keySet.escrow.publicKey)
                const availableFee = escrowBalance.amount - oftStore.tvlLd
                assert.ok(availableFee >= oftFeeLd)

                const destBalanceBefore = await fetchToken(umi, keySet.oappAdminTokenAccount)

                const ix = oft.withdrawFee(
                    {
                        admin: keySet.oappAdmin,
                        mint: keySet.mint.publicKey,
                        escrow: keySet.escrow.publicKey,
                        dest: keySet.oappAdminTokenAccount,
                    },
                    oftFeeLd,
                    { oft: context.program.publicKey }
                )
                await sendAndConfirm(umi, ix, keySet.oappAdmin)

                const destBalanceAfter = await fetchToken(umi, keySet.oappAdminTokenAccount)
                assert.strictEqual(destBalanceAfter.amount, destBalanceBefore.amount + oftFeeLd)
            })
        })
    })
})
