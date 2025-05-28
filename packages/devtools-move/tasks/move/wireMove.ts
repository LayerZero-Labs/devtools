import { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'

import { getConfigConnections } from '../shared/utils'
import { Aptos } from '@aptos-labs/ts-sdk'
import * as oftConfig from './utils/moveVMOftConfigOps'
import { TransactionPayload } from './utils/moveVMOftConfigOps'
import { sendAllTxs } from './utils/utils'
import { getNetworkForChainId } from '@layerzerolabs/lz-definitions'
import { TaskContext } from '../../sdk/baseTaskHelper'
import { IOFT } from '../../sdk/IOFT'
import { EndpointFactory } from '../../sdk/endpointFactory'
import { getDeploymentAddresses } from './utils/config'
import { IEndpoint } from '../../sdk/IEndpoint'

async function wireMove(taskContext: TaskContext) {
    console.log(`\n🔌 Wiring ${taskContext.chain}-${taskContext.stage} OApp`)
    console.log(`\tAddress: ${taskContext.oAppAddress}\n`)

    const deploymentAddresses = await getDeploymentAddresses(taskContext.chain, taskContext.stage)
    const endpointAddress = getEndpointAddressFromNamedAddresses(deploymentAddresses)

    const moveVMEndpoint = EndpointFactory.create(taskContext.moveVMConnection as Aptos, endpointAddress)

    const connectionsFromMoveToAny = await getConfigConnections('from', taskContext.srcEid, taskContext.fullConfigPath)

    const txs = await createWiringTxs(taskContext.oft, moveVMEndpoint, connectionsFromMoveToAny)
    await sendAllTxs(taskContext.moveVMConnection, taskContext.oft, taskContext.accountAddress, txs)
}

async function createWiringTxs(
    oft: IOFT,
    endpoint: IEndpoint,
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
