import { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'
import { Endpoint } from '../../sdk/endpoint'
import { getChain, getConnection } from '../../sdk/moveVMConnectionBuilder'
import { OFT } from '../../sdk/oft'
import { getConfigConnections } from '../shared/utils'
import { Aptos } from '@aptos-labs/ts-sdk'
import { parseYaml } from './utils/aptosNetworkParser'
import { getLzConfig, getMoveVMContracts, getNamedAddresses, promptUserContractSelection } from './utils/config'
import * as oftConfig from './utils/moveVMOftConfigOps'
import { TransactionPayload } from './utils/moveVMOftConfigOps'
import { getContractNameFromLzConfig, getMoveVMOAppAddress, sendAllTxs } from './utils/utils'
import { getNetworkForChainId } from '@layerzerolabs/lz-definitions'
import path from 'path'

async function wireMove(configPath: string) {
    const { account_address, private_key, network, fullnode } = await parseYaml()
    const fullConfigPath = path.join(process.cwd(), configPath)

    const lzConfig = await getLzConfig(configPath)
    const chain = getChain(fullnode)
    const moveVMConnection = getConnection(chain, network)

    const moveVMContracts = getMoveVMContracts(lzConfig)
    const selectedContract = await promptUserContractSelection(moveVMContracts)
    const eid = selectedContract.contract.eid
    const stage = getNetworkForChainId(eid).env
    const contractName = getContractNameFromLzConfig(eid, lzConfig)
    const moveVMOAppAddress = getMoveVMOAppAddress(contractName, chain, stage)

    const namedAddresses = getNamedAddresses(chain, stage)
    const endpointAddress = getEndpointAddressFromNamedAddresses(namedAddresses)

    console.log(`\n🔌 Wiring ${chain}-${stage} OApp`)
    console.log(`\tAddress: ${moveVMOAppAddress}\n`)

    const oftSDK = new OFT(moveVMConnection as Aptos, moveVMOAppAddress, account_address, private_key, eid)
    const moveVMEndpoint = new Endpoint(moveVMConnection as Aptos, endpointAddress)

    const connectionsFromMoveToAny = await getConfigConnections('from', eid, fullConfigPath)

    const txs = await createWiringTxs(oftSDK, moveVMEndpoint, connectionsFromMoveToAny)
    await sendAllTxs(moveVMConnection as Aptos, oftSDK, account_address, txs)
}

async function createWiringTxs(
    oft: OFT,
    endpoint: Endpoint,
    connectionConfigs: OAppOmniGraphHardhat['connections']
): Promise<TransactionPayload[]> {
    const txs: TransactionPayload[] = []

    for (const connection of connectionConfigs) {
        logPathwayHeader(connection)

        const setPeerTx = await oftConfig.createSetPeerTx(oft, connection)
        if (setPeerTx) {
            txs.push(setPeerTx)
        }

        const setEnforcedOptionsTxs = await oftConfig.createSetEnforcedOptionsTxs(oft, connection)
        if (setEnforcedOptionsTxs.length > 0) {
            txs.push(...setEnforcedOptionsTxs)
        }

        const setSendLibraryTx = await oftConfig.createSetSendLibraryTx(oft, endpoint, connection)
        if (setSendLibraryTx) {
            txs.push(setSendLibraryTx)
        }

        const setReceiveLibraryTx = await oftConfig.createSetReceiveLibraryTx(oft, endpoint, connection)
        if (setReceiveLibraryTx) {
            txs.push(setReceiveLibraryTx)
        }

        const setReceiveLibraryTimeoutTx = await oftConfig.createSetReceiveLibraryTimeoutTx(oft, endpoint, connection)
        if (setReceiveLibraryTimeoutTx) {
            txs.push(setReceiveLibraryTimeoutTx)
        }

        const setSendConfigTx = await oftConfig.createSetSendConfigTx(oft, endpoint, connection)
        if (setSendConfigTx) {
            txs.push(setSendConfigTx)
        }

        const setExecutorConfigTx = await oftConfig.createSetExecutorConfigTx(oft, endpoint, connection)
        if (setExecutorConfigTx) {
            txs.push(setExecutorConfigTx)
        }

        const setReceiveConfigTx = await oftConfig.createSetReceiveConfigTx(oft, endpoint, connection)
        if (setReceiveConfigTx) {
            txs.push(setReceiveConfigTx)
        }
    }
    return txs
}

function logPathwayHeader(connection: OAppOmniGraphHardhat['connections'][number]) {
    const fromNetwork = getNetworkForChainId(connection.from.eid)
    const toNetwork = getNetworkForChainId(connection.to.eid)

    const pathwayString = `🔄 Building wire transactions for pathway: ${fromNetwork.chainName}-${fromNetwork.env} → ${toNetwork.chainName}-${toNetwork.env} 🔄`
    const borderLine = '━'.repeat(pathwayString.length)

    console.log(borderLine)
    console.log(pathwayString)
    console.log(`${borderLine}\n`)
}

function getEndpointAddressFromNamedAddresses(namedAddresses: string): string {
    const addresses = namedAddresses.split(',')
    const endpointEntry = addresses.find((addr) => addr.startsWith('endpoint_v2='))
    const endpointAddress = endpointEntry?.split('=')[1]

    if (!endpointAddress) {
        throw new Error('Endpoint address not found in named addresses configuration')
    }

    return endpointAddress
}

export { wireMove }
