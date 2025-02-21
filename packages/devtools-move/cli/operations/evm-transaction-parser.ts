import { INewOperation } from '@layerzerolabs/devtools-extensible-cli/cli/types/NewOperation'
import type { TxReceiptJson } from '../../tasks/evm/utils/types'
import path from 'path'
import fs from 'fs'

class EVMTransactionParserOperation implements INewOperation {
    vm = 'evm'
    operation = 'transaction-parser'
    description = 'Parse EVM transactions'
    reqArgs = ['oapp_config', 'id', 'mode', 'src_eid', 'dst_eid']
    addArgs = [
        {
            name: '--id',
            arg: {
                help: 'Transaction ID',
                required: false,
            },
        },
        {
            name: '--mode',
            arg: {
                help: 'Execution mode - broadcast, dry-run, or calldata',
                required: false,
            },
        },
        {
            name: '--src-eid',
            arg: {
                help: 'Source EID',
                required: false,
            },
        },
        {
            name: '--dst-eid',
            arg: {
                help: 'Destination EID',
                required: false,
            },
        },
    ]

    async impl(args: any): Promise<void> {
        const oappConfig = args.oapp_config
        const executionMode = args.mode
        const transactionId = args.id
        const srcEid = args.src_eid
        const dstEid = args.dst_eid

        const transactionFile = path.resolve(
            path.join(args.rootDir, 'transactions', oappConfig, executionMode, `${transactionId}.json`)
        )
        const transactionFileContent = fs.readFileSync(transactionFile, 'utf8')
        const transactionFileJson: TxReceiptJson = JSON.parse(transactionFileContent)
        console.log(`Parsing transactions file ${transactionFile} \nWith srcEid ${srcEid} and dstEid ${dstEid}`)
        const listOfNoLengthTransactions: string[] = []
        for (const [txType, txReceipts] of Object.entries(transactionFileJson)) {
            if (txReceipts.length === 0) {
                listOfNoLengthTransactions.push(txType)
                continue
            }
            console.log(`\n${txType}:`)
            for (const txReceipt of txReceipts) {
                if (txReceipt.dst_eid === dstEid && txReceipt.src_eid === srcEid) {
                    console.log(txReceipt.data)
                    continue
                }
                console.log(`No matching transaction found for ${txType} with srcEid ${srcEid} and dstEid ${dstEid}`)
            }
        }
        if (listOfNoLengthTransactions.length > 0) {
            console.log('\n========================================')
            console.log('List of operations that do not have transactions:', listOfNoLengthTransactions.join(', '))
            console.log('========================================')
        }
    }
}

const NewOperation = new EVMTransactionParserOperation()
export { NewOperation }
