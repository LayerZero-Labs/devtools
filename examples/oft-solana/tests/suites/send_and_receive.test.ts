import { describe, it, before } from 'mocha'
import { Context, PublicKey, Umi } from '@metaplex-foundation/umi'
import { UMI } from '@layerzerolabs/lz-solana-sdk-v2'
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'

import { getGlobalContext, getGlobalKeys, getGlobalUmi } from '../index.test'
import { expectOftError } from '../helpers'
import { sendAndConfirm } from '../utils'
import { DST_EID, OFT_DECIMALS, endpoint } from '../constants'
import { oft } from '@layerzerolabs/oft-v2-solana-sdk'
import { OftKeySets, TestContext } from '../types'

const helper = new UMI.SendHelper()

describe('send instruction', function () {
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
        describe(`${keyLabel} send failures`, () => {
            it('rejects slippage when min amount exceeds computed amount', async () => {
                const { program } = context
                const keySet = keys[keyLabel]
                const sendAmount = BigInt(1 * 10 ** OFT_DECIMALS)
                const minAmount = BigInt(2 * 10 ** OFT_DECIMALS)
                if (!keySet.oappAdminTokenAccount) {
                    throw new Error('Missing admin token account for send test')
                }

                const ix = await oft.send(
                    umi.rpc,
                    {
                        payer: keySet.oappAdmin,
                        tokenMint: keySet.mint.publicKey,
                        tokenEscrow: keySet.escrow.publicKey,
                        tokenSource: keySet.oappAdminTokenAccount,
                    },
                    {
                        dstEid: DST_EID,
                        to: new Uint8Array(32).fill(1),
                        amountLd: sendAmount,
                        minAmountLd: minAmount,
                        options: new Uint8Array(),
                        composeMsg: undefined,
                        nativeFee: 0n,
                        lzTokenFee: 0n,
                    },
                    {
                        oft: context.program.publicKey,
                        endpoint: endpoint.programId,
                        token: fromWeb3JsPublicKey(TOKEN_PROGRAM_ID),
                    }
                )

                await expectOftError(
                    async () => sendAndConfirm(umi, ix, keySet.oappAdmin),
                    oft.errors.SlippageExceededError,
                    program
                )
            })

            it('rejects invalid sender when remaining accounts are tampered', async () => {
                const { program } = context
                const keySet = keys[keyLabel]
                if (!keySet.oappAdminTokenAccount) {
                    throw new Error('Missing admin token account for send test')
                }

                const remainingAccounts = await helper.getSendAccounts(umi.rpc, {
                    payer: keySet.oappAdmin.publicKey,
                    dstEid: DST_EID,
                    sender: keySet.oftStore,
                    receiver: keySet.oftStore,
                })

                const tamperedAccounts = remainingAccounts.slice()
                tamperedAccounts[1] = { ...tamperedAccounts[1], pubkey: keySet.mint.publicKey }

                const ix = await oft.send(
                    umi.rpc,
                    {
                        payer: keySet.oappAdmin,
                        tokenMint: keySet.mint.publicKey,
                        tokenEscrow: keySet.escrow.publicKey,
                        tokenSource: keySet.oappAdminTokenAccount,
                    },
                    {
                        dstEid: DST_EID,
                        to: new Uint8Array(32).fill(1),
                        amountLd: 1n,
                        minAmountLd: 0n,
                        options: new Uint8Array(),
                        composeMsg: undefined,
                        nativeFee: 0n,
                        lzTokenFee: 0n,
                    },
                    {
                        oft: context.program.publicKey,
                        endpoint: endpoint.programId,
                        token: fromWeb3JsPublicKey(TOKEN_PROGRAM_ID),
                    },
                    tamperedAccounts
                )

                await expectOftError(
                    async () => sendAndConfirm(umi, ix, keySet.oappAdmin),
                    oft.errors.InvalidSenderError,
                    program
                )
            })
        })
    })
})
