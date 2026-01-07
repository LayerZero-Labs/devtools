import { describe, it, before } from 'mocha'
import { Context, generateSigner, PublicKey, sol, Umi } from '@metaplex-foundation/umi'
import assert from 'assert'
import { UMI } from '@layerzerolabs/lz-solana-sdk-v2'

import { expectOftError } from '../helpers'
import { getGlobalContext, getGlobalKeys, getGlobalUmi } from '../index.test'
import { OftKeySets, TestContext } from '../types'
import { oft } from '@layerzerolabs/oft-v2-solana-sdk'
import { sendAndConfirm } from '../utils'
import { endpoint } from '../constants'

const FEE_TOO_HIGH = 10000

describe('set_oft_config', function () {
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
        describe(`${keyLabel} config`, () => {
            let programs: { oft: PublicKey; endpoint: PublicKey }

            before(() => {
                programs = { oft: context.program.publicKey, endpoint: endpoint.programId }
            })

            it('rejects unauthorized config updates', async () => {
                const { program } = context
                const keySet = keys[keyLabel]
                const unauthorizedUser = generateSigner(umi)
                await umi.rpc.airdrop(unauthorizedUser.publicKey, sol(1))

                const ix = oft.setOFTConfig(
                    {
                        admin: unauthorizedUser,
                        oftStore: keySet.oftStore,
                    },
                    {
                        __kind: 'DefaultFee',
                        defaultFee: 100,
                    },
                    programs
                )

                await expectOftError(
                    async () => sendAndConfirm(umi, ix, unauthorizedUser),
                    oft.errors.UnauthorizedError,
                    program
                )
            })

            it('rejects invalid default fee bps', async () => {
                const { program } = context
                const keySet = keys[keyLabel]

                const ix = oft.setOFTConfig(
                    {
                        admin: keySet.oappAdmin,
                        oftStore: keySet.oftStore,
                    },
                    {
                        __kind: 'DefaultFee',
                        defaultFee: FEE_TOO_HIGH,
                    },
                    programs
                )

                await expectOftError(
                    async () => sendAndConfirm(umi, ix, keySet.oappAdmin),
                    oft.errors.InvalidFeeError,
                    program
                )
            })

            it('updates admin, delegate, and fee', async () => {
                const keySet = keys[keyLabel]

                const newAdmin = generateSigner(umi)
                await umi.rpc.airdrop(newAdmin.publicKey, sol(10000))

                await sendAndConfirm(
                    umi,
                    oft.setOFTConfig(
                        {
                            admin: keySet.oappAdmin,
                            oftStore: keySet.oftStore,
                        },
                        {
                            __kind: 'Admin',
                            admin: newAdmin.publicKey,
                        },
                        programs
                    ),
                    keySet.oappAdmin
                )

                const oftStoreAccount = await oft.accounts.fetchOFTStore(umi, keySet.oftStore)
                assert.strictEqual(oftStoreAccount.admin, newAdmin.publicKey)

                await sendAndConfirm(
                    umi,
                    oft.setOFTConfig(
                        {
                            admin: newAdmin,
                            oftStore: keySet.oftStore,
                        },
                        {
                            __kind: 'Admin',
                            admin: keySet.oappAdmin.publicKey,
                        },
                        programs
                    ),
                    newAdmin
                )

                await sendAndConfirm(
                    umi,
                    oft.setOFTConfig(
                        {
                            admin: keySet.oappAdmin,
                            oftStore: keySet.oftStore,
                        },
                        {
                            __kind: 'Delegate',
                            delegate: keySet.delegate.publicKey,
                        },
                        programs
                    ),
                    keySet.oappAdmin
                )

                const oappRegistry = await UMI.EndpointProgram.accounts.fetchOAppRegistry(
                    umi,
                    endpoint.pda.oappRegistry(keySet.oftStore)
                )
                assert.strictEqual(oappRegistry.delegate, keySet.delegate.publicKey)

                await sendAndConfirm(
                    umi,
                    oft.setOFTConfig(
                        {
                            admin: keySet.oappAdmin,
                            oftStore: keySet.oftStore,
                        },
                        {
                            __kind: 'DefaultFee',
                            defaultFee: 500,
                        },
                        programs
                    ),
                    keySet.oappAdmin
                )

                const updatedStore = await oft.accounts.fetchOFTStore(umi, keySet.oftStore)
                assert.strictEqual(updatedStore.defaultFeeBps, 500)
            })
        })
    })
})
