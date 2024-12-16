import * as fs from 'fs'
import path from 'path'
import * as readline from 'readline'

import { Aptos } from '@aptos-labs/ts-sdk'

import { EndpointId, Stage } from '@layerzerolabs/lz-definitions-v3'

import lzConfigAptos from '../../../aptos.layerzero.config'
import { OFT } from '../../../sdk/oft'

import { TransactionPayload } from './aptosOftConfigOps'

import type { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'

export function getDelegateFromLzConfig(eid: EndpointId): string {
    validateAptosDelegate(lzConfigAptos, eid)
    let delegate = ''
    for (const conn of lzConfigAptos.contracts) {
        if (conn.contract.eid == eid) {
            delegate = conn.config?.delegate ?? ''
            delegate = delegate.startsWith('0x') ? delegate : `0x${delegate}`
        }
    }
    return delegate
}

export function getOwnerFromLzConfig(eid: EndpointId): string {
    validateAptosOwner(lzConfigAptos, eid)
    let owner = ''
    for (const conn of lzConfigAptos.contracts) {
        if (conn.contract.eid == eid) {
            owner = conn.config?.owner ?? ''
            owner = owner.startsWith('0x') ? owner : `0x${owner}`
        }
    }
    return owner
}

export function validateAptosDelegate(config: OAppOmniGraphHardhat, eid: EndpointId) {
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

function validateAptosOwner(config: OAppOmniGraphHardhat, eid: EndpointId) {
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

export function getOwner(eid: EndpointId) {
    for (const conn of lzConfigAptos.contracts) {
        if (conn.contract.eid == eid) {
            const owner = conn.config?.owner ?? ''
            return owner.startsWith('0x') ? owner : `0x${owner}`
        }
    }
}

export function getMoveVMOftAddress(stage: Stage) {
    const deploymentPath = path.join(__dirname, `../../../deployments/aptos-${stage}/oft.json`)
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))
    return deployment.address
}

export async function sendAllTxs(
    aptos: Aptos,
    oft: OFT,
    account_address: string,
    payloads: (TransactionPayload | null)[]
) {
    let cleanedPayloads = pruneNulls(payloads)
    cleanedPayloads = sortByEid(cleanedPayloads)

    if (cleanedPayloads.length == 0) {
        console.log('No transactions to send.')
        return
    }
    if (await promptForConfirmation(cleanedPayloads.length)) {
        console.log('\n📦 Transaction Summary:')
        console.log(`   • Total transactions: ${cleanedPayloads.length}`)

        for (let i = 0; i < cleanedPayloads.length; i++) {
            const progress = `[${i + 1}/${cleanedPayloads.length}]`
            console.log(`🔄 ${progress} Processing transaction ${i}: ${cleanedPayloads[i].description}...`)

            const trans = await aptos.transaction.build.simple({
                sender: account_address,
                data: cleanedPayloads[i].payload,
            })
            await oft.signSubmitAndWaitForTx(trans)

            console.log(`✅ ${progress} Transaction ${i} completed\n`)
        }

        console.log('🎉 Transaction Summary:')
        console.log(`   • ${cleanedPayloads.length} transactions processed successfully`)
    } else {
        console.log('Operation cancelled.')
        process.exit(0)
    }
}

function sortByEid(payloads: TransactionPayload[]): TransactionPayload[] {
    // Get unique eids in order of first appearance
    // Get unique eids in order of first appearance
    const eids = [...new Set(payloads.map((p) => p.eid))]

    // Group by eid while maintaining order
    const sortedPayloads: Dictionary<TransactionPayload[]> = {}
    for (const payload of payloads) {
        if (!sortedPayloads[payload.eid]) {
            sortedPayloads[payload.eid] = []
        }
        sortedPayloads[payload.eid].push(payload)
    }

    // Concatenate groups in order of first eid appearance
    return eids.flatMap((eid) => sortedPayloads[eid])
}

type Dictionary<T> = {
    [key: string]: T
}

function pruneNulls(payloads: (TransactionPayload | null)[]): TransactionPayload[] {
    return payloads.filter((payload): payload is TransactionPayload => payload !== null && payload.payload !== null)
}

async function promptForConfirmation(txCount: number): Promise<boolean> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    })

    const answer = await new Promise<string>((resolve) => {
        rl.question(
            `\nReview the ${txCount} transaction(s) above carefully.\nWould you like to proceed with execution? (yes/no): `,
            resolve
        )
    })

    rl.close()
    return answer.toLowerCase() === 'yes'
}

export async function sendInitTransaction(
    moveVMConnection: Aptos,
    oft: OFT,
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
