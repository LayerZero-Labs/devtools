import * as fs from 'fs'
import * as readline from 'readline'

import { Aptos, InputGenerateTransactionPayloadData } from '@aptos-labs/ts-sdk'
import { EndpointId, getNetworkForChainId, Stage } from '@layerzerolabs/lz-definitions'

import { IOFT, TypedAptosPayload, TypedInitiaPayload } from '../../../sdk/IOFT'

import { TransactionPayload } from './moveVMOftConfigOps'

import type { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'
import path from 'path'
import { MsgExecute, RESTClient } from '@initia/initia.js'

export function getDelegateFromLzConfig(eid: EndpointId, config: OAppOmniGraphHardhat): string {
    validateConfigHasDelegate(config, eid)
    let delegate = ''
    for (const conn of config.contracts) {
        if (conn.contract.eid == eid) {
            delegate = conn.config?.delegate ?? ''
            delegate = delegate.startsWith('0x') ? delegate : `0x${delegate}`
        }
    }
    return delegate
}

export function getContractNameFromLzConfig(eid: EndpointId, config: OAppOmniGraphHardhat): string {
    for (const conn of config.contracts) {
        if (conn.contract.eid == eid) {
            return conn.contract.contractName ?? ''
        }
    }
    return ''
}

export function getOwnerFromLzConfig(eid: EndpointId, config: OAppOmniGraphHardhat): string {
    validateConfigHasOwner(config, eid)
    let owner = ''
    for (const conn of config.contracts) {
        if (conn.contract.eid == eid) {
            owner = conn.config?.owner ?? ''
            owner = owner.startsWith('0x') ? owner : `0x${owner}`
        }
    }
    return owner
}

export function validateConfigHasDelegate(config: OAppOmniGraphHardhat, eid: EndpointId) {
    const aptosConfig = config.contracts.find((c: any) => c.contract.eid === eid)

    if (!aptosConfig || !aptosConfig.config || !aptosConfig.config.delegate) {
        console.log(`
[LayerZero Config] Update Required
--------------------------------
Current Configuration:
• delegate: ${aptosConfig?.config?.delegate || 'not found'}

Please update layerzero config with your Aptos delegate address
{
    contract: <your-aptos-contract>,
    config: {
        delegate: '<your-aptos-account-address>',
    }
}
`)
        throw new Error('Please update your Aptos configuration with valid delegate address')
    }
}

function validateConfigHasOwner(config: OAppOmniGraphHardhat, eid: EndpointId) {
    const aptosConfig = config.contracts.find((c: any) => c.contract.eid === eid)

    if (!aptosConfig || !aptosConfig.config || !aptosConfig.config.owner) {
        console.log(`
[LayerZero Config] Update Required
--------------------------------
Current Configuration:
• owner: ${aptosConfig?.config?.owner || 'not found'}

Please update layerzero config with your Aptos owner address
{
    contract: <your-aptos-contract>,
    config: {
        owner: '<your-aptos-account-address>',
    }
}
`)
        throw new Error('Please update your Aptos configuration with valid owner address')
    }
}

export function getOwner(config: OAppOmniGraphHardhat, eid: EndpointId) {
    for (const conn of config.contracts) {
        if (conn.contract.eid == eid) {
            const owner = conn.config?.owner ?? ''
            return owner.startsWith('0x') ? owner : `0x${owner}`
        }
    }
}

export function getMoveVMOAppAddress(
    contractName: string,
    network: string,
    stage: Stage,
    rootDir: string = process.cwd()
) {
    const deploymentPath = path.join(rootDir, `deployments/${network}-${stage}/${contractName}.json`)
    try {
        const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))
        return deployment.address
    } catch (error) {
        throw new Error(`Failed to retrieve deployment address from ${deploymentPath} - file not found`)
    }
}

export async function sendAllTxs(
    moveVMConnection: Aptos | RESTClient,
    oft: IOFT,
    account_address: string,
    payloads: (TransactionPayload | null)[]
) {
    const cleanedPayloads = pruneNulls(payloads)

    if (cleanedPayloads.length == 0) {
        console.log('✨ No transactions to send.')
        return
    }

    const action = await promptForConfirmation(cleanedPayloads.length)
    if (moveVMConnection instanceof RESTClient) {
        sendAllInitiaTxs(moveVMConnection, oft, account_address, cleanedPayloads, action)
    } else if (moveVMConnection instanceof Aptos) {
        sendAllAptosTxs(moveVMConnection, oft, account_address, cleanedPayloads, action)
    }
}

async function sendAllInitiaTxs(
    initiaRESTClient: RESTClient,
    oft: IOFT,
    account_address: string,
    cleanedPayloads: TransactionPayload[],
    action: 'execute' | 'export' | 'cancel'
) {
    if (action === 'execute') {
        console.log('\n📦 Transaction Summary:')
        console.log(`   • Total transactions: ${cleanedPayloads.length}`)

        for (let i = 0; i < cleanedPayloads.length; i++) {
            console.log(
                `🔄 [${i + 1}/${cleanedPayloads.length}] Processing transaction: ${cleanedPayloads[i].description}...`
            )
            try {
                const result = await oft.signSubmitAndWaitForTx(cleanedPayloads[i].payload as MsgExecute)
                console.log(`\t📎 Transaction hash: ${result.txhash}`)
                printExplorerLink(oft.eid, result.txhash, getNetworkForChainId(oft.eid))
            } catch (error: any) {
                console.error('❌ Transaction failed.')
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout,
                })

                const answer = await new Promise<string>((resolve) => {
                    rl.question('Would you like to see the detailed error? (y/n): ', resolve)
                })

                rl.close()

                if (answer.toLowerCase().trim() === 'y') {
                    throw error
                } else {
                    console.error('🛑 Halting execution.')
                    process.exit(0)
                }
            }
        }

        console.log('🎉 Execution Summary:')
        console.log(`   • ${cleanedPayloads.length} transactions executed successfully`)
    } else if (action === 'export') {
        await exportInitiaTransactionsToJson(cleanedPayloads)
    } else {
        console.log('Operation cancelled.')
        process.exit(0)
    }
}

async function sendAllAptosTxs(
    moveVMConnection: Aptos,
    oft: IOFT,
    account_address: string,
    cleanedPayloads: TransactionPayload[],
    action: 'execute' | 'export' | 'cancel'
) {
    if (action === 'execute') {
        console.log('\n📦 Transaction Summary:')
        console.log(`   • Total transactions: ${cleanedPayloads.length}`)

        const maxRetries = 3
        for (let i = 0; i < cleanedPayloads.length; i++) {
            console.log(
                `🔄 [${i + 1}/${cleanedPayloads.length}] Processing transaction: ${cleanedPayloads[i].description}...`
            )

            let retryCount = 0
            while (retryCount < maxRetries) {
                try {
                    await oft.syncSequenceNumber()

                    const trans = await moveVMConnection.transaction.build.simple({
                        sender: account_address,
                        data: cleanedPayloads[i].payload as InputGenerateTransactionPayloadData,
                    })
                    try {
                        const result = await oft.signSubmitAndWaitForTx(trans)
                        console.log(`\t📎 Transaction hash: ${result.hash}`)
                        const network = getNetworkForChainId(oft.eid)
                        printExplorerLink(oft.eid, result.hash, network)
                    } catch (error: any) {
                        console.error('❌ Transaction failed.')
                        const rl = readline.createInterface({
                            input: process.stdin,
                            output: process.stdout,
                        })

                        const answer = await new Promise<string>((resolve) => {
                            rl.question('Would you like to see the detailed error? (y/n): ', resolve)
                        })

                        rl.close()

                        if (answer.toLowerCase().trim() === 'y') {
                            console.error('\nError details:', error)
                        }

                        throw error // Re-throw the error to maintain the original flow
                    }
                    break // Success, exit retry loop
                } catch (error: any) {
                    retryCount++
                    if (retryCount === maxRetries) {
                        throw error // Throw if retries failed
                    }

                    // If sequence number error, wait and retry
                    if (error?.data?.error_code === 'sequence_number_too_old') {
                        console.log('Retrying with updated sequence number...')
                        await new Promise((resolve) => setTimeout(resolve, 1000))
                        continue
                    }

                    throw error
                }
            }
        }

        console.log('🎉 Execution Summary:')
        console.log(`   • ${cleanedPayloads.length} transactions executed successfully`)
    } else if (action === 'export') {
        await exportTransactionsToJson(cleanedPayloads)
    } else {
        console.log('Operation cancelled.')
        process.exit(0)
    }
}

function pruneNulls(payloads: (TransactionPayload | null)[]): TransactionPayload[] {
    return payloads.filter((payload): payload is TransactionPayload => payload !== null && payload.payload !== null)
}

async function promptForConfirmation(txCount: number): Promise<'execute' | 'export' | 'cancel'> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    })

    const answer = await new Promise<string>((resolve) => {
        rl.question(
            `\nReview the ${txCount} transaction(s) above carefully.\nChoose an action:\n` +
                `(y)es - execute transactions\n` +
                `(e)xport - save as JSON for multisig execution\n` +
                `(n)o - cancel\n` +
                `Enter choice: `,
            resolve
        )
    })

    rl.close()
    const choice = answer.toLowerCase().trim()
    if (['yes', 'y'].includes(choice)) {
        return 'execute'
    } else if (['export', 'e'].includes(choice)) {
        return 'export'
    } else {
        return 'cancel'
    }
}

function isAptosPayload(payload: TransactionPayload): payload is {
    description: string
    payload: TypedAptosPayload
} {
    return 'function' in payload.payload && 'functionArguments' in payload.payload
}

function isInitiaPayload(payload: TransactionPayload): payload is {
    description: string
    payload: TypedInitiaPayload
} {
    return payload.payload instanceof MsgExecute && 'types' in payload.payload
}

async function exportInitiaTransactionsToJson(payloads: TransactionPayload[]) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const exportDir = `./initia-raw-transactions/tx-export-${timestamp}`

    if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true })
    }

    payloads.forEach((payload, index) => {
        if (!isInitiaPayload(payload)) {
            throw new Error('Cannot export non-Initia payload to JSON')
        }
        const msgExecute = payload.payload as TypedInitiaPayload

        const jsonPayload = {
            sender: msgExecute.sender,
            module_address: msgExecute.module_address,
            module_name: msgExecute.module_name,
            function_name: msgExecute.function_name,
            type_args: msgExecute.type_args,
            args: msgExecute.args,
            multiSigArgs: formatInitiaArgumentValue(msgExecute.multiSigArgs),
            types: msgExecute.types,
        }

        const filePath = path.join(exportDir, `tx-${index + 1}.json`)
        fs.writeFileSync(filePath, JSON.stringify(jsonPayload, null, 2))
    })

    console.log(`\n📄 Transactions exported to: ${exportDir}`)
}

async function exportTransactionsToJson(payloads: TransactionPayload[]) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const exportDir = `./aptos-raw-transactions/tx-export-${timestamp}`

    if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true })
    }

    payloads.forEach((payload, index) => {
        if (!isAptosPayload(payload)) {
            throw new Error('Cannot export non-Aptos payload to JSON')
        }
        console.log(payload)
        const jsonPayload = {
            function_id: payload.payload.function,
            args: payload.payload.functionArguments.map((arg: any, idx: number) => ({
                type: payload.payload.types[idx],
                value: formatArgumentValue(arg),
            })),
            type_args: [],
        }

        const filePath = path.join(exportDir, `tx-${index + 1}.json`)
        fs.writeFileSync(filePath, JSON.stringify(jsonPayload, null, 2))
    })

    console.log(`\n📄 Transactions exported to: ${exportDir}`)
}

function formatInitiaArgumentValue(arg: any): any {
    if (Array.isArray(arg)) {
        return arg.map((item: any) => formatInitiaArgumentValue(item))
    }
    if (arg instanceof Uint8Array) {
        return Array.from(arg)
    }
    return arg
}

function formatArgumentValue(arg: any): any {
    if (Array.isArray(arg)) {
        return arg.map((item: any) => item)
    }
    return arg
}

export async function sendInitTransaction(
    moveVMConnection: Aptos | RESTClient,
    oft: IOFT,
    account_address: string,
    payloads: TransactionPayload[]
) {
    try {
        await sendAllTxs(moveVMConnection, oft, account_address, payloads)
    } catch (error: any) {
        if (error.message?.includes('EALREADY_INITIALIZED')) {
            console.log('\n✅ OFT already initialized. No values changed.\n')
        } else {
            console.error('Error:', error)
        }
    }
}

function printExplorerLink(eid: EndpointId, txHash: string, network: { env: string }): void {
    let link = ''
    if (eid === EndpointId.APTOS_V2_TESTNET || eid === EndpointId.APTOS_V2_MAINNET) {
        link = `https://explorer.aptoslabs.com/txn/${txHash}?network=${network.env}`
    } else if (eid === EndpointId.MOVEMENT_V2_MAINNET || eid === EndpointId.MOVEMENT_V2_TESTNET) {
        if (network.env === 'testnet') {
            link = `https://explorer.movementnetwork.xyz/txn/${txHash}?network=bardock+testnet`
        } else if (network.env === 'mainnet') {
            link = `https://explorer.movementnetwork.xyz/txn/${txHash}?network=mainnet`
        }
    } else if (eid === EndpointId.INITIA_V2_TESTNET) {
        link = `https://scan.testnet.initia.xyz/initiation-2/txs/${txHash}`
    }
    if (link) {
        console.log(`\t🔍 Explorer Link: ${link}`)
    }
}
