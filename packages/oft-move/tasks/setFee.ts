import { EndpointId, getNetworkForChainId } from '@layerzerolabs/lz-definitions'
import { sendAllTxs } from '@layerzerolabs/devtools-move/tasks/move/utils/utils'
import { createSetFeeBpsTx } from '@layerzerolabs/devtools-move/tasks/move/utils/moveVMOftConfigOps'
import { OFTType } from '@layerzerolabs/devtools-move/sdk/IOFT'
import { TaskContext } from '@layerzerolabs/devtools-move/sdk/baseTaskHelper'

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
