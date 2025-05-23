import { publicKey } from '@metaplex-foundation/umi'
import { task, types } from 'hardhat/config'
import { ActionType, HardhatRuntimeEnvironment } from 'hardhat/types'

import { EndpointId } from '@layerzerolabs/lz-definitions'

import { myoapp } from '../../lib/client'
import { deriveConnection, getSolanaDeployment } from '../solana'

import { isEvmEid, isSolanaEid, listEidsInLzConfig } from './utils'

interface Args {
    contractName: string
    oappConfig: string
}

const action: ActionType<Args> = async ({ oappConfig, contractName }, hre: HardhatRuntimeEnvironment) => {
    const eids = await listEidsInLzConfig(hre, oappConfig)

    console.log('\n🌐 LayerZero OApp States\n')

    for (const eid of eids) {
        console.group(`→ endpoint ${eid}`)

        if (isSolanaEid(eid)) {
            const solanaState = await fetchSolanaOappState(eid)
            console.log('Solana OApp PDA:', solanaState._oappPda)
            console.log('Solana OApp Data:', solanaState.string)
        } else if (isEvmEid(eid)) {
            const evm = await fetchEvmOappState(eid, hre, contractName)
            console.log('EVM OApp Address:', evm.address)
            console.log('EVM OApp Data:', evm.data)
        } else {
            console.log('Unknown endpoint type:', eid)
        }

        console.groupEnd()
        console.log() // blank line for spacing
    }
}

async function fetchEvmOappState(eid: EndpointId, hre: HardhatRuntimeEnvironment, contractName: string) {
    const contract = await hre.ethers.getContract(contractName)
    return {
        address: contract.address,
        // @ts-expect-error data method exists on MyOApp
        data: await contract.data(),
    }
}

async function fetchSolanaOappState(eid: EndpointId) {
    const { umi } = await deriveConnection(eid, true)
    const deployment = getSolanaDeployment(eid)
    const client = new myoapp.MyOApp(publicKey(deployment.programId))
    const [pda] = client.pda.oapp()
    const store = await myoapp.accounts.fetchStore(umi, pda)
    return {
        _oappPda: pda.toString(),
        ...store,
    }
}

task('lz:oapp:get', 'Fetch and pretty-print OApp state for each configured endpoint', action)
    .addParam('oappConfig', 'The LZ config file to use', undefined, types.string, true)
    .addOptionalParam('contractName', 'Name of the EVM OApp contract (default: MyOApp)', 'MyOApp', types.string)
