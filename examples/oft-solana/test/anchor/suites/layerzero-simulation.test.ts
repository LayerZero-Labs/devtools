import assert from 'assert'

import { fetchToken } from '@metaplex-foundation/mpl-toolbox'
import { Context, Umi, generateSigner, sol } from '@metaplex-foundation/umi'
import { fromWeb3JsPublicKey, toWeb3JsKeypair, toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount } from '@solana/spl-token'

import { oft } from '@layerzerolabs/oft-v2-solana-sdk'

import { DST_EID, OFT_DECIMALS } from '../constants'
import { quoteOft, quoteSend, send } from '../helpers'
import { getGlobalContext, getGlobalKeys, getGlobalUmi } from '../index.test'
import { OftKeySets, TestContext } from '../types'
import { verifyAndReceive } from '../utils'

describe('LayerZero Simulation', function () {
    let umi: Umi | Context
    let context: TestContext
    let keys: OftKeySets

    before(async function () {
        context = getGlobalContext()
        umi = getGlobalUmi()
        keys = getGlobalKeys()
    })
    ;(['native', 'adapter'] as const).forEach((keyLabel) => {
        it(`simulates send and receive for ${keyLabel}`, async () => {
            const keySet = keys[keyLabel]
            if (!keySet.oappAdminTokenAccount) {
                throw new Error('Missing admin token account for simulation')
            }

            const sendAmount = BigInt(500 * 10 ** OFT_DECIMALS)

            const dest = generateSigner(umi)
            await umi.rpc.airdrop(dest.publicKey, sol(10))

            const tokenDest = await getOrCreateAssociatedTokenAccount(
                context.connection,
                toWeb3JsKeypair(dest),
                toWeb3JsPublicKey(keySet.mint.publicKey),
                toWeb3JsPublicKey(dest.publicKey),
                false,
                undefined,
                undefined,
                TOKEN_PROGRAM_ID
            )

            const quote = await quoteOft(context, keySet, keySet.oappAdmin, dest.publicKey, DST_EID, sendAmount)
            const amountSentLd = quote.oftReceipt.amountSentLd
            const amountReceivedLd = quote.oftReceipt.amountReceivedLd
            const oftFeeLd = amountSentLd - amountReceivedLd
            assert.ok(amountSentLd >= amountReceivedLd)

            const fee = await quoteSend(context, keySet, keySet.oappAdmin, dest.publicKey, DST_EID, sendAmount)

            const beforeSourceBalance = await fetchToken(umi, keySet.oappAdminTokenAccount)
            const beforeEscrowBalance = await fetchToken(umi, keySet.escrow.publicKey)
            const beforeDestBalance = await fetchToken(umi, fromWeb3JsPublicKey(tokenDest.address))
            const beforeStore = await oft.accounts.fetchOFTStore(umi, keySet.oftStore)

            const packetSentEvent = await send(
                context,
                keySet,
                keySet.oappAdmin,
                keySet.oappAdminTokenAccount,
                dest.publicKey,
                DST_EID,
                sendAmount,
                fee
            )

            const afterSendSourceBalance = await fetchToken(umi, keySet.oappAdminTokenAccount)
            const afterSendEscrowBalance = await fetchToken(umi, keySet.escrow.publicKey)
            const afterSendDestBalance = await fetchToken(umi, fromWeb3JsPublicKey(tokenDest.address))
            const afterSendStore = await oft.accounts.fetchOFTStore(umi, keySet.oftStore)

            assert.strictEqual(
                afterSendSourceBalance.amount,
                beforeSourceBalance.amount - amountSentLd,
                'Source should be debited by amount sent'
            )

            if (keyLabel === 'adapter') {
                assert.strictEqual(
                    afterSendEscrowBalance.amount,
                    beforeEscrowBalance.amount + amountSentLd,
                    'Escrow should hold sent amount for adapter'
                )
                assert.strictEqual(afterSendStore.tvlLd, beforeStore.tvlLd + amountReceivedLd)
            } else {
                assert.strictEqual(
                    afterSendEscrowBalance.amount,
                    beforeEscrowBalance.amount + oftFeeLd,
                    'Escrow should hold fees for native'
                )
                assert.strictEqual(afterSendStore.tvlLd, beforeStore.tvlLd)
            }

            assert.strictEqual(afterSendDestBalance.amount, beforeDestBalance.amount)

            await verifyAndReceive(context, keySet, packetSentEvent)

            const afterReceiveDestBalance = await fetchToken(umi, fromWeb3JsPublicKey(tokenDest.address))
            const afterReceiveEscrowBalance = await fetchToken(umi, keySet.escrow.publicKey)
            const afterReceiveStore = await oft.accounts.fetchOFTStore(umi, keySet.oftStore)

            assert.strictEqual(
                afterReceiveDestBalance.amount,
                beforeDestBalance.amount + amountReceivedLd,
                'Destination should receive amount received'
            )

            if (keyLabel === 'adapter') {
                assert.strictEqual(
                    afterReceiveEscrowBalance.amount,
                    afterSendEscrowBalance.amount - amountReceivedLd,
                    'Escrow should release amount received'
                )
                assert.strictEqual(afterReceiveStore.tvlLd, afterSendStore.tvlLd - amountReceivedLd)
            } else {
                assert.strictEqual(afterReceiveEscrowBalance.amount, afterSendEscrowBalance.amount)
                assert.strictEqual(afterReceiveStore.tvlLd, afterSendStore.tvlLd)
            }
        })
    })
})
