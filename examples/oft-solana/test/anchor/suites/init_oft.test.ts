import assert from 'assert'

import { Context, TransactionBuilder, Umi, publicKeyBytes, sol } from '@metaplex-foundation/umi'
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { before, describe, it } from 'mocha'

import { OFT_DECIMALS, OftPDA, oft } from '@layerzerolabs/oft-v2-solana-sdk'

import { DST_EID, OFT_PROGRAM_ID, SRC_EID, endpoint, uln } from '../constants'
import { createOftKeys } from '../helpers'
import { expectOftError } from '../helpers/error-assertions'
import { initOft } from '../helpers/oft-layerzero-simulation'
import { getGlobalContext, getGlobalKeys, getGlobalUmi, setGlobalKeys } from '../index.test'
import { OftKeySets, TestContext } from '../types'
import { initMint } from '../utils'

const TOKEN_PROGRAM = fromWeb3JsPublicKey(TOKEN_PROGRAM_ID)

describe('init_oft', function () {
    this.timeout(300000)

    let context: TestContext
    let umi: Umi | Context
    let keys: OftKeySets

    before(async function () {
        context = getGlobalContext()
        umi = getGlobalUmi()
        keys = getGlobalKeys()

        await umi.rpc.airdrop(keys.native.oappAdmin.publicKey, sol(10000))
        await umi.rpc.airdrop(keys.adapter.oappAdmin.publicKey, sol(10000))

        await initMint(context, keys.native, TOKEN_PROGRAM)
        await initMint(context, keys.adapter, TOKEN_PROGRAM)
        setGlobalKeys(keys)
    })

    it('rejects init_oft when shared decimals exceed mint decimals', async () => {
        const invalidKeys = createOftKeys(OFT_PROGRAM_ID, 'oft-invalid')
        await umi.rpc.airdrop(invalidKeys.oappAdmin.publicKey, sol(10000))
        await initMint(context, invalidKeys, TOKEN_PROGRAM, OFT_DECIMALS - 1)

        await expectOftError(
            async () => initOft(umi as Umi, invalidKeys, oft.types.OFTType.Native, OFT_DECIMALS),
            oft.errors.InvalidDecimalsError,
            context.program
        )
    })

    it('initializes native and adapter OFTs', async () => {
        await initOft(umi as Umi, keys.native, oft.types.OFTType.Native, OFT_DECIMALS)
        await initOft(umi as Umi, keys.adapter, oft.types.OFTType.Adapter, OFT_DECIMALS)

        const nativeStore = await oft.accounts.fetchOFTStore(umi, keys.native.oftStore)
        const adapterStore = await oft.accounts.fetchOFTStore(umi, keys.adapter.oftStore)

        assert.strictEqual(nativeStore.oftType, oft.types.OFTType.Native)
        assert.strictEqual(adapterStore.oftType, oft.types.OFTType.Adapter)

        const [nativeTypes] = new OftPDA(context.program.publicKey).lzReceiveTypesAccounts(keys.native.oftStore)
        const [adapterTypes] = new OftPDA(context.program.publicKey).lzReceiveTypesAccounts(keys.adapter.oftStore)

        const nativeTypesAccount = await oft.accounts.fetchLzReceiveTypesAccounts(umi, nativeTypes)
        const adapterTypesAccount = await oft.accounts.fetchLzReceiveTypesAccounts(umi, adapterTypes)

        assert.strictEqual(nativeTypesAccount.oftStore, keys.native.oftStore)
        assert.strictEqual(adapterTypesAccount.oftStore, keys.adapter.oftStore)
    })

    it('sets OApp libraries and nonces', async () => {
        await setupOappLibraries(umi as Umi, keys.native)
        await setupOappLibraries(umi as Umi, keys.adapter)
    })
})

async function setupOappLibraries(umi: Umi, keySet: OftKeySets['native']): Promise<void> {
    const oftStore = keySet.oftStore
    await new TransactionBuilder(
        [
            endpoint.initOAppSendLibrary(keySet.oappAdmin, { sender: oftStore, remote: DST_EID }),
            endpoint.setOAppSendLibrary(keySet.oappAdmin, {
                sender: oftStore,
                remote: DST_EID,
                msgLibProgram: uln.programId,
            }),
            endpoint.initOAppReceiveLibrary(keySet.oappAdmin, { receiver: oftStore, remote: SRC_EID }),
            endpoint.setOAppReceiveLibrary(keySet.oappAdmin, {
                receiver: oftStore,
                remote: SRC_EID,
                msgLibProgram: uln.programId,
            }),
            endpoint.initOAppNonce(keySet.oappAdmin, {
                localOApp: oftStore,
                remote: DST_EID,
                remoteOApp: publicKeyBytes(oftStore),
            }),
            endpoint.initOAppNonce(keySet.oappAdmin, {
                localOApp: oftStore,
                remote: SRC_EID,
                remoteOApp: publicKeyBytes(oftStore),
            }),
        ],
        { feePayer: keySet.oappAdmin }
    ).sendAndConfirm(umi)
}
