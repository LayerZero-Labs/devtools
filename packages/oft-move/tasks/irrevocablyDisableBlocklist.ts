import {
    createIrrevocablyDisableBlocklistPayload,
    sendAllTxs,
    TaskContext,
    OFTType,
} from '@layerzerolabs/devtools-move'

async function irrevocablyDisableBlocklist(taskContext: TaskContext, oftType: OFTType) {
    console.log(`\n🔧 Irrevocably Disabling Blocklist for ${taskContext.chain}-${taskContext.stage} OFT`)
    console.log(`\tFor: ${taskContext.oAppAddress}\n`)
    console.log(
        `\t\x1b[33m Warning: This action is irreversible and will permanently disable blocklisting ability.\x1b[0m`
    )

    const payload = createIrrevocablyDisableBlocklistPayload(taskContext.oft, oftType)

    await sendAllTxs(taskContext.moveVMConnection, taskContext.oft, taskContext.accountAddress, [payload])
}

export { irrevocablyDisableBlocklist }
