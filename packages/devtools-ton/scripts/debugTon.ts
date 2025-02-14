import { Cell } from '@ton/core'
import { TonClient3 } from '@ton/ton'

import {
    ERRORS,
    NAME_WIDTH,
    OPCODES,
    TonContractWrapper,
    bigintToAsciiString,
    clGetUint,
    decodeClass,
    deepDecode,
    opcodeToName,
    parseTonAddress,
    tonObjects,
} from '@layerzerolabs/lz-ton-sdk-v2'
import { createTonClient3Factory, createTonClientFactory } from '../src'
import { Chain, chainAndStageToEndpointId, EndpointVersion, Stage } from '@layerzerolabs/lz-definitions'
import { parseArgs } from 'node:util'

//the true name of the class
type TonRealNameType = keyof typeof tonObjects
//the name as extracted from the cell
type TonCellNameType = (typeof tonObjects)[keyof typeof tonObjects]['name']

type TransactionTrace = Awaited<ReturnType<InstanceType<typeof TonClient3>['getTransactionTrace']>>
type Transaction = TransactionTrace['transaction']

export const tonRealNameByCellName = Object.fromEntries(
    Object.entries(tonObjects)
        .filter(([_, v]) => {
            // Filter out empty objects
            return Object.keys(v).length > 1
        })
        .map(([k, v]) => [v.name, k])
) as Record<TonCellNameType, TonRealNameType>

/**
 * Get the class name of a TON cell. The name encoded in the cell is
 * different from the desired "true" name, so the name is converted.
 * @param classCandidate
 * @returns the corrected name, as used by lzDecodeClass(), or NULL if it can't be parsed.
 */
const getName = (classCandidate: Cell): TonRealNameType | null => {
    try {
        //try to get the name from the first 10 bytes of the cell
        const cellName = classCandidate.asSlice().loadUintBig(NAME_WIDTH)
        const asciiCellName = bigintToAsciiString(cellName) as TonCellNameType
        //check if the name is legitimate, and then find the real name
        return tonRealNameByCellName[asciiCellName] ?? null
    } catch (e) {
        return null
    }
}

const RST = '\x1b[0m'
const FG_BLK = '\x1b[30m'
const FG_RED = '\x1b[31m'
const FG_GRN = '\x1b[32m'
const FG_BLU = '\x1b[34m'
const FG_MGA = '\x1b[35m'
const FG_CYN = '\x1b[36m'

const BG_WHT = '\x1b[47m'

const args = parseArgs({
    header: 'Check TON message delivery',
    description: 'Evaluates source and destination transactions to determine what went wrong in a TON transaction',
    options: {
        environment: {
            short: 'e',
            type: 'string',
            default: 'mainnet',
        },
        txHash: {
            short: 't',
            type: 'string',
        },
        extraInfoUid: {
            alias: 'u',
            type: 'string',
            defaultValue: '',
        },
    },
})

const opcodeToRecipientContract = (opcode: bigint): string | null => {
    if (opcode === OPCODES.Endpoint_OP_ENDPOINT_SEND) {
        return 'Endpoint'
    } else if (opcode === OPCODES.Channel_OP_CHANNEL_SEND) {
        return 'Channel'
    } else if (opcode === OPCODES.MsglibManager_OP_SET_OAPP_MSGLIB_RECEIVE_CONFIG) {
        return 'ULN Manager'
    } else if (opcode === OPCODES.MsglibManager_OP_SET_OAPP_MSGLIB_SEND_CONFIG) {
        return 'ULN Manager'
    } else if (opcode === OPCODES.MsglibConnection_OP_MSGLIB_CONNECTION_SEND) {
        return 'ULN Connection'
    } else if (opcode === OPCODES.Uln_OP_ULN_SEND) {
        return 'ULN'
    } else if (opcode === OPCODES.Channel_OP_LZ_RECEIVE_PREPARE) {
        return 'Channel'
    } else if (opcode === OPCODES.Layerzero_OP_LZ_RECEIVE_PREPARE) {
        return 'oApp'
    }
    return null
}
const opcodeToSenderContract = (opcode: bigint): string | null => {
    if (opcode === OPCODES.Endpoint_OP_ENDPOINT_SEND) {
        return 'oApp'
    } else if (opcode === OPCODES.Layerzero_OP_LZ_RECEIVE_PREPARE) {
        return 'Channel'
    }
    return null
}

const parseEventSubtopic = (tx: Transaction): string => {
    const subtopic = bigintToAsciiString(clGetUint(Cell.fromBase64(tx.in_msg!.message_content.body).refs[0]!, 0, 256))
    return subtopic
}

const txIsEvent = (tx: Transaction): boolean => {
    return !!tx.in_msg?.opcode && BigInt(tx.in_msg.opcode) === OPCODES.BaseInterface_OP_EVENT
}

const diagFailedTx = async (tx: Transaction) => {
    if (tx.in_msg?.opcode == null) {
        console.log('\\ tx has NULL opcode')
        return
    }
    //check if account exists
    if (tx.account_state_after.account_status == null || tx.account_state_after.account_status === 'nonexist') {
        console.log(`\\ tx was to account that doesn't exist (${tx.in_msg.destination})`)
        return
    }
    const compute = tx.description?.compute_ph
    if (compute && compute.type != 'skipped') {
        console.log(
            `\\ tx used ${
                (BigInt(compute.gas_used ?? 0) / BigInt(compute.gas_limit ?? 0)) * BigInt(100)
            }% of its gas limit`
        )
    } else {
        console.log('\\ tx skipped the compute phase')
        if (
            (tx.account_state_before.account_status == null || tx.account_state_before.account_status === 'nonexist') &&
            tx.account_state_after.account_status === 'active'
        ) {
            console.log('\\ tx appears to have been account activation--probably not a real failure')
        } else {
            console.log('\\ unclear why this tx failed. dumping the full log: ' + JSON.stringify(tx))
        }
    }
}

//PROCESSING STEPS

type StepResult = { succeeded: boolean; failureInfo?: string }
type Step = {
    name: string
    mandatory: boolean
    opcode: bigint
    func: (tx: Transaction) => Promise<StepResult>
}

const checkEndpointSend = async (tx: Transaction): Promise<StepResult> => {
    const endpointSend = decodeClass('md::LzSend', Cell.fromBase64(tx.in_msg!.message_content.body!).refs[0]!)
    if (endpointSend.nativeFee === BigInt(0) && endpointSend.zroFee === BigInt(0)) {
        return {
            succeeded: false,
            failureInfo: 'no fee passed in lzSend object',
        }
    } else {
        return {
            succeeded: true,
        }
    }
}

const checkChannelSendCallback = async (tx: Transaction): Promise<StepResult> => {
    const channelSendCallback = tx.in_msg?.message_content.body
    const channelSendCallbackParsed = deepDecode(decodeClass, Cell.fromBase64(channelSendCallback!).refs[0]!) as {
        md: { errorCode: number }
    }
    const errorCode = channelSendCallbackParsed.md.errorCode.toString()
    const error = Object.entries(ERRORS).find(([_, v]) => v.toString() === errorCode)?.[0]
    return {
        succeeded: error == null || error === 'NO_ERROR',
        ...(error !== 'NO_ERROR' ? { failureInfo: error } : {}),
    }
}

const checkLzReceiveExecute = async (tx: Transaction): Promise<StepResult> => {
    const executeData = tx.in_msg?.message_content.body
    const executeParsed = decodeClass('md::MdObj', Cell.fromBase64(executeData!).refs[0]!)
    const packetParsed = decodeClass('lz::Packet', executeParsed.md)
    if (packetParsed.nonce < BigInt(0)) {
        return {
            succeeded: false,
            failureInfo: 'packet has invalid nonce',
        }
    }
    return {
        succeeded: true,
    }
}

const checkLzReceiveExecuteCallback = async (tx: Transaction): Promise<StepResult> => {
    const executeCallbackData = tx.in_msg?.message_content.body
    const executeCallbackParsed = deepDecode(decodeClass, Cell.fromBase64(executeCallbackData!).refs[0]!) as Partial<
        ReturnType<typeof decodeClass<'md::LzReceiveStatus'>>
    > | null
    return { succeeded: executeCallbackParsed?.success ?? true }
}

const SRC_STEPS: Step[] = [
    {
        name: 'oApp calls lzSend on endpoint',
        mandatory: true,
        opcode: OPCODES.Endpoint_OP_ENDPOINT_SEND,
        func: checkEndpointSend,
    },
    {
        name: 'Channel sends success callback',
        mandatory: true,
        opcode: OPCODES.Layerzero_OP_CHANNEL_SEND_CALLBACK,
        func: checkChannelSendCallback,
    },
] as const
const DST_STEPS: Step[] = [
    {
        name: 'Channel calls lzReceive on oApp',
        mandatory: true,
        opcode: OPCODES.Layerzero_OP_LZ_RECEIVE_EXECUTE,
        func: checkLzReceiveExecute,
    },
    {
        name: 'oApp sends success callback',
        mandatory: true,
        opcode: OPCODES.Channel_OP_LZ_RECEIVE_EXECUTE_CALLBACK,
        func: checkLzReceiveExecuteCallback,
    },
] as const

const isLzMessage = (transactions: Transaction[]): 'SRC' | 'DST' | false => {
    if (transactions.find((t) => BigInt(t.in_msg?.opcode ?? '') === SRC_STEPS[0]!.opcode)) {
        return 'SRC'
    } else if (transactions.find((t) => BigInt(t.in_msg?.opcode ?? '') === DST_STEPS[0]!.opcode)) {
        return 'DST'
    }
    return false
}

/**
 * Walks through a list of steps, comparing each step to the array of
 * all successful transactions. If a step was not completed, stop there
 * and log information about why
 * @param transactions a list of all successful transactions in consideration
 * @param steps an ordered array of steps to perform
 * @returns a boolean indicating whether the overall execution can be considered a success
 */
const walkThroughSteps = async (transactions: Transaction[], steps: Step[]): Promise<boolean | undefined> => {
    const failed = (step: Step, index: number, failure?: string) => {
        console.log(
            `> (${index}/${steps.length}) ${step.mandatory ? 'Necessary' : 'Optional'} step '${step.name}' failed!`
        )
        if (failure) {
            console.log(`   the failure reason is: ${failure}`)
        }
    }
    const untried = (step: Step, index: number) => {
        console.log(
            `> (${index}/${steps.length}) ${
                step.mandatory ? 'Necessary' : 'Optional'
            } step '${step.name}' was never attempted!`
        )
    }
    const passed = (step: Step, index: number) => {
        console.log(
            `> (${index}/${steps.length}) ${step.mandatory ? 'Necessary' : 'Optional'} step '${step.name}' succeeded!`
        )
    }
    let i = 0
    for (const step of steps) {
        i++
        const tx = transactions.find((t) => BigInt(t.in_msg?.opcode ?? '') === step.opcode)
        if (tx == null) {
            if (i === 1) {
                //if the first step was untried, we didn't fail per se
                return undefined
            }
            //only log this if it wasn't the first step--then we can gracefully return without logging
            untried(step, i)
            if (step.mandatory) {
                return false
            }
            continue
        }
        const result = await step.func(tx)
        if (!result.succeeded) {
            failed(step, i, result.failureInfo)
            if (step.mandatory) {
                return false
            }
        }
        passed(step, i)
    }
    return true
}

const main = async () => {
    const { environment, txHash, extraInfoUid } = args.values
    if (!environment) {
        throw new Error('Must provide environment argument!')
    }
    if (!txHash) {
        throw new Error('Must provide txHash argument!')
    }
    const eid = chainAndStageToEndpointId(
        Chain.TON,
        (environment === 'localnet' ? 'sandbox' : environment) as Stage,
        EndpointVersion.V2
    )

    const client = await createTonClientFactory()(eid)
    const client3 = await createTonClient3Factory()(eid)

    const successfulOperations: Record<string, { opcode: string; tx: Transaction }> = {}
    const failedOperations: Record<string, { opcode: string; tx: Transaction }> = {}
    let id: number = 0
    const names: Record<string, string | undefined | null> = {}

    const evalMsgs = (
        prevNode: TransactionTrace | null,
        node: TransactionTrace,
        depth: number,
        isEldest: boolean,
        uid: string,
        bounceId?: string | null
    ): (() => void) => {
        const toWrite: (() => void)[] = []
        const inMsg = node.transaction.in_msg
        if (prevNode != null && !prevNode.transaction.out_msgs.map((msg) => msg.hash).includes(inMsg!.hash)) {
            throw 'Fatal error while parsing trace: this node is not contained by its parent!'
        }
        const opcode = BigInt(inMsg!.opcode ?? 0)
        const opcodeName = opcodeToName(opcode)
        const myId = bounceId ?? uid + id++
        let thisFailed = false
        let thisCreated = false
        if (!node.transaction.description.aborted && node.transaction.description.action?.success) {
            successfulOperations[myId] = {
                opcode: opcodeName,
                tx: node.transaction,
            }
        } else {
            failedOperations[myId] = {
                opcode: opcodeName,
                tx: node.transaction,
            }
            thisFailed = true
        }
        if (node.transaction.orig_status === 'nonexist' && node.transaction.end_status === 'active') {
            thisCreated = true
        }

        const senderCandidate = opcodeToSenderContract(opcode)
        const recipientCandidate = opcodeToRecipientContract(opcode)
        if (senderCandidate != null) {
            names[inMsg!.source ?? ''] = senderCandidate
        }
        if (recipientCandidate != null) {
            names[inMsg!.destination ?? ''] = recipientCandidate
        }

        const sDepth = depth++
        if (id > 1) {
            toWrite.push(() => {
                console.log(
                    `${'  '.repeat(Math.max(sDepth, 0))}${
                        isEldest ? '-' : ' '
                    }${thisFailed ? FG_RED : ''}${myId}${RST} ${depth % 2 === 0 ? FG_CYN : FG_MGA}${
                        names[inMsg!.source ?? 'unknown'] ??
                        (inMsg!.source != null ? inMsg!.source?.substring(0, 5) + '...' : 'Entry')
                    }${RST} -> <${opcodeName}> -> ${thisCreated ? FG_GRN : depth % 2 === 0 ? FG_MGA : FG_CYN}${
                        names[inMsg!.destination ?? 'unknown'] ??
                        (inMsg!.destination != null ? inMsg!.destination?.substring(0, 5) + '...' : 'Entry')
                    }${RST}${node.transaction.description.bounce ? ` ${FG_RED}(BOUNCED)${RST}` : ''}`
                )
            })
        }
        node.children.forEach((child) => {
            if (!node.transaction.out_msgs.map((msg) => msg.hash).includes(child.transaction.in_msg!.hash)) {
                throw 'This node sent an out message that did not create a corresponding child! Execution is probably not finished; try again shortly'
            }
            toWrite.push(
                evalMsgs(
                    node,
                    child,
                    depth,
                    child === node.children[0],
                    uid,
                    node.transaction.description.bounce ? myId + '_b' : null
                )
            )
        })
        return () => {
            toWrite.forEach((cmd) => cmd())
        }
    }

    const txTrace = await client3.getTransactionTrace(txHash)
    console.log(`\n${FG_BLK}${BG_WHT}---Traversing TX Trace---${RST}`)
    evalMsgs(null, txTrace, 0, true, 'tx')()

    if (extraInfoUid) {
        console.log(
            JSON.stringify(
                successfulOperations[extraInfoUid.replace('-', '')] ?? failedOperations[extraInfoUid.replace('-', '')]
            )
        )
    }

    console.log(`\n${FG_BLK}${BG_WHT}---Interpretation---${RST}`)

    //map this to make it a little easier to filter on
    const failedTransactions = Object.entries(failedOperations).map((op) => {
        return {
            uid: op[0],
            tx: op[1].tx,
            opcode: op[1].opcode,
        }
    })

    //all failed txes are either events or real failures
    const events = failedTransactions.filter(({ tx }) => txIsEvent(tx))
    const realFailures = failedTransactions.filter(({ tx }) => !txIsEvent(tx))

    if (events.length > 0) {
        console.log('events emitted during this execution:')
        await Promise.all(
            events.map(async (op) => {
                console.log(`${FG_BLU}(${op.uid})${RST} <${op.opcode}> -- ${parseEventSubtopic(op.tx)}`)
            })
        )
    }

    if (realFailures.length > 0) {
        console.log('failed and aborted transactions during this execution:')
        await Promise.all(
            realFailures.map(async (op) => {
                console.log(
                    `${FG_RED}(${op.uid})${RST} <${op.opcode}> -- ${FG_RED}${
                        op.tx.description.aborted ? `ABORTED` : `FAILED`
                    }${RST}`
                )
                await diagFailedTx(op.tx)
            })
        )
        console.log(
            `\nrun this command again with -u for more info about any transaction. e.g., -u ${
                Object.keys(failedOperations)[0]
            }`
        )
    }

    //check contract deployments
    const creations = Object.entries(successfulOperations).filter(
        ([_, v]) => v.opcode === opcodeToName(OPCODES.BaseInterface_OP_INITIALIZE)
    )
    if (creations.length) {
        console.log(`${creations.length} contracts were deployed during this execution`)
        await Promise.all(
            creations.map(async ([k, v]) => {
                const address = v.tx.in_msg?.destination
                const deployedData = await client
                    .open(new TonContractWrapper(parseTonAddress(address!)))
                    .getCurrentStorageCell()
                const name = getName(deployedData)
                console.log(`${FG_GRN}(${k})${RST} ${address}`)
                console.log(`\\ contract type: ${name}`)
            })
        )
    }

    //check if tx is lzMessage on source or dest
    const sTxs = Object.values(successfulOperations).map((v) => v.tx)
    switch (isLzMessage(sTxs)) {
        case 'SRC':
            {
                console.log(`\n${FG_BLK}${BG_WHT}---LayerZero Source TX Analysis---${RST}`)
                const srcRes = await walkThroughSteps(sTxs, SRC_STEPS)
                console.log(`${srcRes ? `${FG_GRN}SUCCEEDED` : `${FG_RED}FAILED`}${RST}`)
            }
            break
        case 'DST':
            {
                console.log(`\n${FG_BLK}${BG_WHT}---LayerZero Destination TX Analysis---${RST}`)
                const dstRes = await walkThroughSteps(sTxs, DST_STEPS)
                console.log(`${dstRes ? `${FG_GRN}SUCCEEDED` : `${FG_RED}failed`}${RST}`)
            }
            break
        default:
            console.log('Unable to parse this transaction as part of a LayerZero message')
    }
}

main().then(() => process.exit(0))
