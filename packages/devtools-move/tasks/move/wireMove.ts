import { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'
import { Endpoint } from '../../sdk/endpoint'
import { getChain, getConnection } from '../../sdk/moveVMConnectionBuilder'
import { OFT } from '../../sdk/oft'
import { getConfigConnections } from '../shared/utils'

import { getEidFromMoveNetwork, getLzNetworkStage, parseYaml } from './utils/aptosNetworkParser'
import { getLzConfig, getNamedAddresses } from './utils/config'
import * as oftConfig from './utils/moveVMOftConfigOps'
import { TransactionPayload } from './utils/moveVMOftConfigOps'
import { getContractNameFromLzConfig, getMoveVMOAppAddress, sendAllTxs } from './utils/utils'
import { getNetworkForChainId } from '@layerzerolabs/lz-definitions'
import path from 'path'

async function wireMove(configPath: string) {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()
    const fullConfigPath = path.join(process.cwd(), configPath)

    const lzConfig = await getLzConfig(configPath)
    const chain = getChain(fullnode)
    const moveVMConnection = getConnection(chain, network, fullnode, faucet)

    const lzNetworkStage = getLzNetworkStage(network)
    const eid = getEidFromMoveNetwork(chain, network)
    const contractName = getContractNameFromLzConfig(eid, lzConfig)
    const moveVMOAppAddress = getMoveVMOAppAddress(contractName, chain, lzNetworkStage)

    const namedAddresses = getNamedAddresses(lzNetworkStage)
    const endpointAddress = getEndpointAddressFromNamedAddresses(namedAddresses)

    console.log(`\n🔌 Wiring ${chain}-${lzNetworkStage} OApp`)
    console.log(`\tAddress: ${moveVMOAppAddress}\n`)

    const oftSDK = new OFT(moveVMConnection, moveVMOAppAddress, account_address, private_key, eid)
    const moveVMEndpoint = new Endpoint(moveVMConnection, endpointAddress)

    const currDelegate = await oftSDK.getDelegate()
    validateDelegate(currDelegate, account_address)

    const moveVMEndpointID = getEidFromMoveNetwork(chain, network)
    const connectionsFromMoveToAny = await getConfigConnections('from', moveVMEndpointID, fullConfigPath)

    const txs = await createWiringTxs(oftSDK, moveVMEndpoint, connectionsFromMoveToAny)
    await sendAllTxs(moveVMConnection, oftSDK, account_address, txs)
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

function validateDelegate(currDelegate: string, account_address: string) {
    if (currDelegate != account_address) {
        throw new Error(
            `Delegate must be set to account address of the transaction sender for wiring.\n\tCurrent delegate: ${currDelegate}, expected: ${account_address}\n\n`
        )
    }
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
