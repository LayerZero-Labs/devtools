import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

class MoveMultisigExecuteOperation implements INewOperation {
    vm = 'move'
    operation = 'multisig-execute'
    description = 'Creates, approves, and executes multisig transactions from a folder'
    reqArgs = [
        'multisig_address',
        'transactions_folder_path',
        'proposer_key_file_path',
        'approver_key_file_paths',
        'max_gas',
    ]

    addArgs = [
        {
            name: '--multisig-address',
            arg: {
                help: 'multisig address',
                required: true,
            },
        },
        {
            name: '--transactions-folder-path',
            arg: {
                help: 'transactions folder path',
                required: true,
            },
        },
        {
            name: '--proposer-key-file-path',
            arg: {
                help: 'private key file path for the proposer',
                required: true,
            },
        },
        {
            name: '--approver-key-file-paths',
            arg: {
                help: 'comma-separated list of private key file paths for additional approvers',
                required: true,
            },
        },
        {
            name: '--max-gas',
            arg: {
                help: 'max gas',
                required: true,
            },
        },
        {
            name: '--store-hash-only',
            arg: {
                help: 'store only transaction hash on-chain',
                required: false,
                default: false,
            },
        },
    ]

    /**
     * Helper to get the next multisig transaction sequence number
     * from the on-chain "next_sequence_number" field.
     */
    private getNextMultisigSequenceNumber = (multisigAddr: string): number => {
        const cmd = `aptos move view \
            --function-id 0x1::multisig_account::next_sequence_number \
            --args address:${multisigAddr}`
        const rawResult = execSync(cmd, { stdio: 'pipe', encoding: 'utf-8' })
        const parsed = JSON.parse(rawResult)
        return Number(parsed.Result[0])
    }

    /**
     * Wait in a loop for the newly created transaction (with the known seqNum)
     * to appear on-chain in "get_transaction", up to maxAttempts.
     */
    private waitForTransactionToAppear = async (
        multisigAddr: string,
        seqNum: number,
        maxAttempts = 10
    ): Promise<boolean> => {
        const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

        for (let i = 0; i < maxAttempts; i++) {
            // Delay the first attempt slightly:
            if (i === 0) {
                console.log('Waiting for transaction to be recorded on-chain...')
                await sleep(5000)
            }

            try {
                const viewCmd = `aptos move view \
                    --function-id 0x1::multisig_account::get_transaction \
                    --args address:${multisigAddr} u64:${seqNum}`

                const raw = execSync(viewCmd, { stdio: 'pipe', encoding: 'utf-8' })
                const parsed = JSON.parse(raw)
                if (parsed.Result && parsed.Result[0]) {
                    // If we got a result back, the transaction is on-chain
                    const txInfo = parsed.Result[0]
                    // Typically the field "creation_time_secs" must exist if it's real
                    if (txInfo.creation_time_secs) {
                        return true
                    }
                }
                console.log(`Attempt ${i + 1}/${maxAttempts}: Transaction #${seqNum} not found, waiting...`)
            } catch (error: any) {
                console.log(`Attempt ${i + 1}/${maxAttempts}: Error checking transaction, retrying...`)
                if (error.stdout) {
                    console.error('Command output:', error.stdout.toString())
                }
            }

            await sleep(5000)
        }

        return false
    }

    private verifyCanBeExecuted = async (multisigAddr: string, seqNum: number): Promise<boolean> => {
        try {
            const command = `aptos move view \
                --function-id 0x1::multisig_account::can_be_executed \
                --args address:"${multisigAddr}" String:${seqNum}`

            const result = execSync(command, {
                stdio: 'pipe',
                encoding: 'utf-8',
            }).toString()

            const parsed = JSON.parse(result)
            return parsed.Result && parsed.Result[0] === true
        } catch (e) {
            console.error('Error checking if transaction can be executed:', e)
            return false
        }
    }

    private verifyProposal = async (
        multisigAddr: string,
        jsonFilePath: string,
        seqNum: number,
        storeHashOnly: boolean
    ): Promise<boolean> => {
        // We sleep a bit first just in case the chain hasn't fully indexed the proposal
        const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
        await sleep(5000)

        if (storeHashOnly) {
            // If only the hash is stored on-chain, pass the entire json file
            const verifyCommand = `aptos multisig verify-proposal \
                --multisig-address ${multisigAddr} \
                --json-file ${jsonFilePath} \
                --sequence-number ${seqNum}`

            console.log('Verify command (hash-only):', verifyCommand)
            try {
                execSync(verifyCommand, { stdio: 'inherit' })
                return true
            } catch (error: any) {
                console.error('Proposal verification failed (hash-only):', error)
                return false
            }
        } else {
            // If the entire payload is on-chain, we pass function-id, type-args, and args
            try {
                const txContent = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'))

                // Format args with their types
                const formattedArgs = txContent.args
                    .map((arg: any) => {
                        if (typeof arg === 'object' && arg.type && arg.value) {
                            // Ensure addresses have 0x prefix
                            const value =
                                arg.type === 'address' && !arg.value.startsWith('0x') ? `0x${arg.value}` : arg.value
                            return `${arg.type}:${value}`
                        }
                        // If it's a string with "type:value" already:
                        if (typeof arg === 'string' && arg.includes(':')) {
                            return arg
                        }
                        return arg
                    })
                    .join(' ')

                const typeArgs = txContent.type_args?.length ? '--type-args ' + txContent.type_args.join(' ') : ''

                const verifyCommand = `aptos multisig verify-proposal \
                    --multisig-address ${multisigAddr} \
                    --function-id ${txContent.function_id} \
                    ${typeArgs} \
                    --args ${formattedArgs} \
                    --sequence-number ${seqNum}`

                console.log('Verify command (full-payload):', verifyCommand)
                execSync(verifyCommand, { stdio: 'inherit' })
                return true
            } catch (error: any) {
                console.error('Proposal verification failed (full-payload):', error)
                try {
                    const txContent = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'))
                    console.log('Transaction content:', JSON.stringify(txContent, null, 2))
                } catch (readError) {
                    console.error('Failed to read transaction file:', readError)
                }
                return false
            }
        }
    }

    async impl(args: any): Promise<void> {
        const multisigAddress = String(args.multisig_address)
        const transactionsFolderPath = String(args.transactions_folder_path)
        const proposerKeyPath = String(args.proposer_key_file_path)
        const approverKeyPaths = String(args.approver_key_file_paths).split(',')
        const maxGas = Number(args.max_gas)
        const storeHashOnly = Boolean(args.store_hash_only)

        const files = fs.readdirSync(transactionsFolderPath)
        const jsonFiles = files.filter((file) => file.endsWith('.json'))

        if (jsonFiles.length === 0) {
            console.log('No transaction files found in the specified folder')
            return
        }

        // No need to bind methods anymore since we're using arrow functions
        for (const file of jsonFiles) {
            const fullPath = path.join(transactionsFolderPath, file)
            console.log(`Processing transaction from file: ${file}`)

            try {
                const seqNum = this.getNextMultisigSequenceNumber(multisigAddress)
                console.log(`Next multisig sequence number: ${seqNum}`)

                // 2) Create the transaction (this enqueues a new transaction at seqNum)
                console.log('Creating transaction proposal...')
                const createCmd = `aptos multisig create-transaction \
                    --multisig-address ${multisigAddress} \
                    --json-file ${fullPath} \
                    ${storeHashOnly ? '--store-hash-only' : ''} \
                    --private-key-file ${proposerKeyPath} \
                    --assume-yes`

                execSync(createCmd, { stdio: 'inherit' })

                // 3) Wait for the chain to show that transaction #seqNum has arrived
                console.log('Waiting for transaction to be confirmed...')
                const found = await this.waitForTransactionToAppear(multisigAddress, seqNum)
                if (!found) {
                    throw new Error(`Transaction with sequence number ${seqNum} not found after multiple attempts`)
                }

                // 4) Verify the proposal for each approval signer
                console.log('Verifying proposal...')
                const isValid = await this.verifyProposal(multisigAddress, fullPath, seqNum, storeHashOnly)
                if (!isValid) {
                    throw new Error('Proposal verification failed')
                }

                // 5) Approve (vote) using each key in approverKeyPaths
                console.log('Getting approvals...')
                for (const approverKeyPath of approverKeyPaths) {
                    console.log(`Getting approval from ${approverKeyPath}...`)
                    const approveCmd = `aptos multisig approve \
                        --multisig-address ${multisigAddress} \
                        --sequence-number ${seqNum} \
                        --private-key-file ${approverKeyPath} \
                        --assume-yes`
                    execSync(approveCmd, { stdio: 'inherit' })

                    // short delay between approvals
                    await new Promise((resolve) => setTimeout(resolve, 2000))
                }

                // 6) Confirm it can be executed
                console.log('Verifying transaction can be executed...')
                const canExecute = await this.verifyCanBeExecuted(multisigAddress, seqNum)
                if (!canExecute) {
                    throw new Error(`Transaction ${seqNum} cannot be executed (need more approvals?).`)
                }

                // 7) Execute the transaction
                console.log('Executing transaction...')
                const executeCmd = storeHashOnly
                    ? `aptos multisig execute-with-payload \
                          --multisig-address ${multisigAddress} \
                          --json-file ${fullPath} \
                          --private-key-file ${proposerKeyPath} \
                          --max-gas ${maxGas} \
                          --assume-yes`
                    : `aptos multisig execute \
                          --multisig-address ${multisigAddress} \
                          --private-key-file ${proposerKeyPath} \
                          --max-gas ${maxGas} \
                          --assume-yes`

                execSync(executeCmd, { stdio: 'inherit' })
                console.log(`Successfully processed transaction from file: ${file}`)

                // short delay between transactions
                await new Promise((resolve) => setTimeout(resolve, 2000))
            } catch (error: any) {
                console.error(`Failed to process transaction from file: ${file}`)
                if (error.stdout) {
                    console.error('Command output:', error.stdout)
                }
                if (error.stderr) {
                    console.error('Command error:', error.stderr)
                }
                throw error
            }
        }
    }

    constructor() {
        // Bind all methods in constructor
        this.getNextMultisigSequenceNumber = this.getNextMultisigSequenceNumber.bind(this)
        this.waitForTransactionToAppear = this.waitForTransactionToAppear.bind(this)
        this.verifyCanBeExecuted = this.verifyCanBeExecuted.bind(this)
        this.verifyProposal = this.verifyProposal.bind(this)
        this.impl = this.impl.bind(this)
    }
}

const NewOperation = new MoveMultisigExecuteOperation()
export { NewOperation }
