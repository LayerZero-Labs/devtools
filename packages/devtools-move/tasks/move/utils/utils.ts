import * as fs from 'fs'
import * as readline from 'readline'

import { Aptos } from '@aptos-labs/ts-sdk'

import { EndpointId, Stage } from '@layerzerolabs/lz-definitions'

import { OFT } from '../../../sdk/oft'

import { TransactionPayload } from './moveVMOftConfigOps'

import type { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'
import path from 'path'

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

export function getMoveVMOftAddress(network: string, stage: Stage, rootDir: string = process.cwd()) {
    const deploymentPath = path.join(rootDir, `deployments/${network}-${stage}/oft.json`)
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))
    return deployment.address
}

export async function sendAllTxs(
    aptos: Aptos,
    oft: OFT,
    account_address: string,
    payloads: (TransactionPayload | null)[]
) {
    const cleanedPayloads = pruneNulls(payloads)

    if (cleanedPayloads.length == 0) {
        console.log('✨ No transactions to send.')
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
            const result = await oft.signSubmitAndWaitForTx(trans)

            console.log(`   📎 Transaction hash: ${result.hash}`)
            console.log(`   🔍 Explorer: https://explorer.aptoslabs.com/txn/${result.hash}?network=testnet`)
        }

        console.log('🎉 Transaction Summary:')
        console.log(`   • ${cleanedPayloads.length} transactions processed successfully`)
    } else {
        console.log('Operation cancelled.')
        process.exit(0)
    }
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
    return ['yes', 'y'].includes(answer.toLowerCase().trim())
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
