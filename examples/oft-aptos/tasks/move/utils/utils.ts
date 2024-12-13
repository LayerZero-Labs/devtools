import lzConfigAptos from '../../../aptos.layerzero.config'
import { promptForConfirmation } from '../../shared/utils'
import type { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'
import { Aptos, InputGenerateTransactionPayloadData } from '@aptos-labs/ts-sdk'
import { EndpointId, Stage } from '@layerzerolabs/lz-definitions-v3'
import path from 'path'
import * as fs from 'fs'
import { OFT } from '../../../sdk/oft'

export function getDelegateFromLzConfig(eid: EndpointId): string {
    validateAptosDelegate(lzConfigAptos, eid)
    let delegate = ''
    for (const conn of lzConfigAptos.contracts) {
        if (conn.contract.eid == eid) {
            delegate = conn.config.delegate
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
            owner = conn.config.owner
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
            const owner = conn.config.owner
            return owner.startsWith('0x') ? owner : `0x${owner}`
        }
    }
}

export function getAptosOftAddress(stage: Stage) {
    const deploymentPath = path.join(__dirname, `../../../deployments/aptos-${stage}/oft.json`)
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))
    return deployment.address
}

export async function sendAllTxs(
    aptos: Aptos,
    oft: OFT,
    account_address: string,
    payloads: InputGenerateTransactionPayloadData[]
) {
    payloads = pruneNulls(payloads)
    if (payloads.length == 0) {
        console.log('No transactions to send.')
        return
    }
    if (await promptForConfirmation(payloads.length)) {
        console.log('\n📦 Transaction Summary:')
        console.log(`   • Total transactions: ${payloads.length}`)

        for (let i = 0; i < payloads.length; i++) {
            const progress = `[${i + 1}/${payloads.length}]`
            console.log(`🔄 ${progress} Processing transaction ${i}...`)

            const trans = await aptos.transaction.build.simple({
                sender: account_address,
                data: payloads[i],
            })
            await oft.signSubmitAndWaitForTx(trans)

            console.log(`✅ ${progress} Transaction ${i} completed\n`)
        }

        console.log('🎉 Transaction Summary:')
        console.log(`   • ${payloads.length} transactions processed successfully`)
    } else {
        console.log('Operation cancelled.')
        process.exit(0)
    }
}

function pruneNulls(payloads: InputGenerateTransactionPayloadData[]): InputGenerateTransactionPayloadData[] {
    return payloads.filter((payload) => payload !== null)
}
