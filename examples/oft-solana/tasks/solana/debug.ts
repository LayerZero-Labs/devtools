import { publicKey } from '@metaplex-foundation/umi'
import { toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { PublicKey } from '@solana/web3.js'
import { task } from 'hardhat/config'

import { types } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { EndpointPDADeriver, EndpointProgram } from '@layerzerolabs/lz-solana-sdk-v2'
import { oft } from '@layerzerolabs/oft-v2-solana-sdk'

import { deriveConnection, getSolanaDeployment } from './index'

/**
 * Get the OFTStore account from the task arguments, the deployment file, or throw an error.
 * @param {EndpointId} eid
 * @param {string} oftStore
 */
const getOftStore = (eid: EndpointId, oftStore?: string) => publicKey(oftStore ?? getSolanaDeployment(eid).oftStore)

task('lz:oft:solana:dump-oft-store', 'Gets the OFTStore information')
    .addParam(
        'eid',
        'Solana mainnet (30168) or testnet (40168).  Defaults to mainnet.',
        EndpointId.SOLANA_V2_MAINNET,
        types.eid
    )
    .addParam(
        'oftStore',
        'The OFTStore public key. Derived from deployments if not provided.',
        undefined,
        types.string,
        true
    )
    .setAction(async (taskArgs, _) => {
        const { umi } = await deriveConnection(taskArgs.eid)
        const oftStore = getOftStore(taskArgs.eid, taskArgs.oftStore)
        console.dir(await oft.accounts.fetchOFTStore(umi, oftStore), { depth: null })
    })

task('lz:oft:solana:get-admin', 'Gets the OFTStore information')
    .addParam(
        'eid',
        'Solana mainnet (30168) or testnet (40168).  Defaults to mainnet.',
        EndpointId.SOLANA_V2_MAINNET,
        types.eid
    )
    .addParam(
        'oftStore',
        'The OFTStore public key. Derived from deployments if not provided.',
        undefined,
        types.string,
        true
    )
    .setAction(async (taskArgs, _) => {
        const { umi } = await deriveConnection(taskArgs.eid)
        const oftStore = getOftStore(taskArgs.eid, taskArgs.oftStore)
        console.log(`admin: ${(await oft.accounts.fetchOFTStore(umi, oftStore)).admin}`)
    })

task('lz:oft:solana:get-delegate', 'Gets the OAppRegistry information')
    .addParam(
        'eid',
        'Solana mainnet (30168) or testnet (40168).  Defaults to mainnet.',
        EndpointId.SOLANA_V2_MAINNET,
        types.eid
    )
    .addParam(
        'oftStore',
        'The OFTStore public key. Derived from deployments if not provided.',
        undefined,
        types.string,
        true
    )
    .addParam('endpoint', 'The Endpoint public key', EndpointProgram.PROGRAM_ID.toBase58(), types.string)
    .setAction(async (taskArgs, _) => {
        const { connection } = await deriveConnection(taskArgs.eid)
        const deriver = new EndpointPDADeriver(new PublicKey(taskArgs.endpoint))
        const oftStore = getOftStore(taskArgs.eid, taskArgs.oftStore)
        const [oAppRegistry] = deriver.oappRegistry(toWeb3JsPublicKey(oftStore))
        const oAppRegistryInfo = await EndpointProgram.accounts.OAppRegistry.fromAccountAddress(
            connection,
            oAppRegistry
        )
        console.log(`delegate: ${oAppRegistryInfo?.delegate?.toBase58()}`)
    })
