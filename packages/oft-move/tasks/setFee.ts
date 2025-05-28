import { EndpointId, getNetworkForChainId } from '@layerzerolabs/lz-definitions'

import { sendAllTxs, createSetFeeBpsTx, OFTType, TaskContext } from '@layerzerolabs/devtools-move'

async function setFee(feeBps: bigint, toEid: EndpointId, oftType: OFTType, taskContext: TaskContext) {
    console.log(`\n🔧 Setting ${taskContext.chain}-${taskContext.stage} OFT Fee BPS`)
    console.log(`\tFor: ${taskContext.oAppAddress}\n`)

    const toNetwork = getNetworkForChainId(toEid)
    console.log(`\tPathway: ${taskContext.chain}-${taskContext.stage} -> ${toNetwork.chainName}-${toNetwork.env}\n`)
    console.log(`\tFee BPS: ${feeBps}\n`)

    const setFeeBpsPayload = await createSetFeeBpsTx(taskContext.oft, feeBps, toEid, oftType)

    await sendAllTxs(taskContext.moveVMConnection, taskContext.oft, taskContext.accountAddress, [setFeeBpsPayload])
}

export { setFee }
