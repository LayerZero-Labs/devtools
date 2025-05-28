import { publicKey } from '@metaplex-foundation/umi'
import { toWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters'
import { task } from 'hardhat/config'

import { types } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { EndpointPDADeriver, EndpointProgram } from '@layerzerolabs/lz-solana-sdk-v2'
import { oft } from '@layerzerolabs/oft-v2-solana-sdk'

import { DebugLogger } from '../common/utils'

import { deriveConnection, getSolanaDeployment } from './index'

interface Args {
    eid: EndpointId
    oftStore?: string
}

task('lz:oft:solana:debug', 'Show basic information about an OFT store')
    .addParam('eid', 'Solana endpoint ID', EndpointId.SOLANA_V2_MAINNET, types.eid)
    .addOptionalParam('oftStore', 'OFTStore public key', undefined, types.string)
    .setAction(async ({ eid, oftStore }: Args) => {
        const { umi, connection } = await deriveConnection(eid, true)
        const storePk = publicKey(oftStore ?? getSolanaDeployment(eid).oftStore)
        const store = await oft.accounts.fetchOFTStore(umi, storePk)

        DebugLogger.header('OFT Store')
        DebugLogger.keyValue('Owner', store.header.owner)
        DebugLogger.keyValue('Admin', store.admin)
        DebugLogger.keyValue('Token Mint', store.tokenMint)
        DebugLogger.keyValue('Token Escrow', store.tokenEscrow)

        const deriver = new EndpointPDADeriver(store.endpointProgram)
        const [registry] = deriver.oappRegistry(toWeb3JsPublicKey(storePk))
        const info = await EndpointProgram.accounts.OAppRegistry.fromAccountAddress(connection, registry)
        if (info) DebugLogger.keyValue('Delegate', info.delegate.toBase58())
    })
