import { publicKey } from '@metaplex-foundation/umi'
import { task, types } from 'hardhat/config'
import { ActionType, HardhatRuntimeEnvironment } from 'hardhat/types'

import { EndpointId } from '@layerzerolabs/lz-definitions'

import { omnicounter } from '../../lib/client'
import { deriveConnection, getSolanaDeployment } from '../solana'

import { isEvmEid, isSolanaEid, listEidsInLzConfig } from './utils'

// TODO: change this to debug command

interface Args {
    contractName: string
    oappConfig: string
}

// TODO: read eid's from LZ config
// TODO: take in eids as param

const action: ActionType<Args> = async ({ oappConfig, contractName }, hre: HardhatRuntimeEnvironment) => {
    const eids = await listEidsInLzConfig(hre, oappConfig)

    for (const eid of eids) {
        if (isSolanaEid(eid)) {
            const solanaOapp = await fetchSolanaOappState(eid)
            console.log(`Solana OApp Data: ${solanaOapp.string}`)
        } else if (isEvmEid(eid)) {
            const emvOapp = await fetchEvmOappState(eid, hre, contractName)
            console.log(`EVM OApp Data: ${emvOapp.data}`)
        }
    }
}

async function fetchEvmOappState(eid: EndpointId, hre: HardhatRuntimeEnvironment, contractName: string) {
    const evmOapp = await hre.ethers.getContract(contractName)
    console.log(`EVM OApp Address: ${evmOapp.address}`)
    return {
        // @ts-expect-error data method exists on MyOApp
        data: await evmOapp.data(),
    }
}

async function fetchSolanaOappState(eid: EndpointId) {
    const readOnly = true
    const { umi } = await deriveConnection(eid, readOnly)
    const solanaDeployment = getSolanaDeployment(eid)
    const counter: omnicounter.OmniCounter = new omnicounter.OmniCounter(publicKey(solanaDeployment.programId))
    const [oapp] = counter.pda.oapp()

    console.log(`Solana OApp PDA: ${oapp}`)

    const oappInfo = await omnicounter.accounts.fetchStore(umi, oapp)
    return oappInfo
}

task('lz:oapp:get', 'gets the oapp address', action)
    .addParam('oappConfig', 'The LZ Config file to use', undefined, types.string, true)
    .addOptionalParam('contractName', 'Name of the EVM OApp contract in deployments folder', 'MyOApp', types.string)
