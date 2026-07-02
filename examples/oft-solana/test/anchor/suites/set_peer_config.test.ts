import assert from 'assert'

import { Context, Program, ProgramError, Umi, generateSigner, publicKeyBytes, sol } from '@metaplex-foundation/umi'
import { before, describe, it } from 'mocha'

import { Options } from '@layerzerolabs/lz-v2-utilities'
import { oft } from '@layerzerolabs/oft-v2-solana-sdk'

import { DST_EID, SRC_EID } from '../constants'
import { expectOftError } from '../helpers'
import { getGlobalContext, getGlobalKeys, getGlobalUmi } from '../index.test'
import { OftKeySets, TestContext } from '../types'
import { sendAndConfirm, setPeerConfig } from '../utils'

const enforcedOptions = Options.newOptions().addExecutorLzReceiveOption(200_000, 2_500_000).toBytes()

describe('set_peer_config', function () {
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
        describe(`${keyLabel} peer config`, () => {
            it('rejects unauthorized peer updates', async () => {
                const { program } = context
                const keySet = keys[keyLabel]
                const invalidSender = generateSigner(umi)
                await umi.rpc.airdrop(invalidSender.publicKey, sol(1))

                const ix = oft.setPeerConfig(
                    {
                        admin: invalidSender,
                        oftStore: keySet.oftStore,
                    },
                    {
                        __kind: 'PeerAddress',
                        remote: DST_EID,
                        peer: publicKeyBytes(keySet.oftStore),
                    },
                    context.programRepo
                )

                await expectOftError(
                    async () => sendAndConfirm(umi, ix, invalidSender),
                    oft.errors.UnauthorizedError,
                    program
                )
            })

            it('rejects invalid fee bps', async () => {
                const { program } = context
                const keySet = keys[keyLabel]

                const ix = oft.setPeerConfig(
                    {
                        admin: keySet.oappAdmin,
                        oftStore: keySet.oftStore,
                    },
                    {
                        __kind: 'FeeBps',
                        remote: DST_EID,
                        feeBps: 10000,
                    },
                    context.programRepo
                )

                await expectOftError(
                    async () => sendAndConfirm(umi, ix, keySet.oappAdmin),
                    oft.errors.InvalidFeeError,
                    program
                )
            })

            it('rejects invalid enforced options', async () => {
                const { program } = context
                const keySet = keys[keyLabel]

                const invalidOptions = Uint8Array.from([0, 1])
                const ix = oft.setPeerConfig(
                    {
                        admin: keySet.oappAdmin,
                        oftStore: keySet.oftStore,
                    },
                    {
                        __kind: 'EnforcedOptions',
                        remote: DST_EID,
                        send: invalidOptions,
                        sendAndCall: invalidOptions,
                    },
                    context.programRepo
                )

                await expectOftError(
                    async () => sendAndConfirm(umi, ix, keySet.oappAdmin),
                    class InvalidOptionsError extends ProgramError {
                        override readonly name: string = 'InvalidOptions'
                        readonly code: number = 0x1770 // 6000
                        constructor(program: Program, cause?: Error) {
                            super('InvalidOptions', program, cause)
                        }
                    },
                    program
                )
            })

            it('sets peer addresses and enforced options', async () => {
                const keySet = keys[keyLabel]
                const peerAddr = publicKeyBytes(keySet.oftStore)

                const dstPeer = await setPeerConfig(
                    umi as Umi,
                    keySet,
                    context.pda,
                    context.programRepo,
                    peerAddr,
                    DST_EID
                )
                const srcPeer = await setPeerConfig(
                    umi as Umi,
                    keySet,
                    context.pda,
                    context.programRepo,
                    peerAddr,
                    SRC_EID
                )

                const [dstPeerAccount, srcPeerAccount] = await oft.accounts.fetchAllPeerConfig(umi, [dstPeer, srcPeer])
                assert.strictEqual(dstPeerAccount.peerAddress.toString(), peerAddr.toString())
                assert.strictEqual(srcPeerAccount.peerAddress.toString(), peerAddr.toString())

                await sendAndConfirm(
                    umi,
                    [
                        oft.setPeerConfig(
                            { admin: keySet.oappAdmin, oftStore: keySet.oftStore },
                            {
                                __kind: 'EnforcedOptions',
                                remote: DST_EID,
                                send: enforcedOptions,
                                sendAndCall: enforcedOptions,
                            },
                            context.programRepo
                        ),
                        oft.setPeerConfig(
                            { admin: keySet.oappAdmin, oftStore: keySet.oftStore },
                            {
                                __kind: 'EnforcedOptions',
                                remote: SRC_EID,
                                send: enforcedOptions,
                                sendAndCall: enforcedOptions,
                            },
                            context.programRepo
                        ),
                    ],
                    keySet.oappAdmin
                )
            })

            it('sets outbound rate limit values', async () => {
                const keySet = keys[keyLabel]

                await sendAndConfirm(
                    umi,
                    oft.setPeerConfig(
                        { admin: keySet.oappAdmin, oftStore: keySet.oftStore },
                        {
                            __kind: 'OutboundRateLimit',
                            remote: DST_EID,
                            rateLimit: { refillPerSecond: 1n, capacity: 5n },
                        },
                        context.programRepo
                    ),
                    keySet.oappAdmin
                )

                const [peer] = context.pda.peer(keySet.oftStore, DST_EID)
                const peerConfig = await oft.accounts.fetchPeerConfig(umi, peer)
                assert.ok(peerConfig.outboundRateLimiter.__option === 'Some')
                assert.strictEqual(peerConfig.outboundRateLimiter.value.capacity, 5n)

                await sendAndConfirm(
                    umi,
                    oft.setPeerConfig(
                        { admin: keySet.oappAdmin, oftStore: keySet.oftStore },
                        {
                            __kind: 'OutboundRateLimit',
                            remote: DST_EID,
                            rateLimit: undefined,
                        },
                        context.programRepo
                    ),
                    keySet.oappAdmin
                )
            })
        })
    })
})
