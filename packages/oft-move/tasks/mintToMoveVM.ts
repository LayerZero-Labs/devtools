import { TransactionPayload, sendAllTxs, TaskContext } from '@layerzerolabs/devtools-move'

async function mintToMoveVM(taskContext: TaskContext, amountLd: number, toAddress: string) {
    console.log(`\n🪙  Minting ${taskContext.chain}-${taskContext.stage} OFT ✨`)
    console.log(`\tAddress: ${taskContext.oAppAddress}`)
    console.log(`\tAmount: ${amountLd}`)
    console.log(`\tTo: ${toAddress}`)
    const mintPayload = taskContext.oft.mintPayload(toAddress, amountLd)

    const transactionPayload: TransactionPayload = {
        payload: mintPayload,
        description: `Mint ${taskContext.chain}-${taskContext.stage} OFT`,
        eid: taskContext.srcEid,
    }
    await sendAllTxs(taskContext.moveVMConnection, taskContext.oft, taskContext.accountAddress, [transactionPayload])
}

export default mintToMoveVM
