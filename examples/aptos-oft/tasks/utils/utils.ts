import hardhatConfig from '../../hardhat.config'
import lzConfigAptos from '../../aptos.layerzero.config'
import type { OAppNodeConfig, OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'
import { Aptos, InputGenerateTransactionPayloadData, Network } from '@aptos-labs/ts-sdk'
import { EndpointId, Stage } from '@layerzerolabs/lz-definitions-v3'
import path from 'path'
import * as fs from 'fs'
import { OFT } from '../../sdk/oft'
import * as readline from 'readline'

export const networkToIndexerMapping = {
    [Network.CUSTOM]: 'http://127.0.0.1:8090/v1',
}

export function createEidToNetworkMapping(_value: string = ''): Record<number, string> {
    const networks = hardhatConfig.networks

    const eidNetworkNameMapping: Record<number, string> = {}
    for (const [networkName, networkConfig] of Object.entries(networks)) {
        if (_value == '') {
            eidNetworkNameMapping[networkConfig.eid] = networkName
        } else {
            eidNetworkNameMapping[networkConfig.eid] = networkConfig[_value]
        }
    }

    return eidNetworkNameMapping
}

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

function validateAptosDelegate(config: OAppOmniGraphHardhat, eid: EndpointId) {
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

export function getConfigConnections(_key: string, _eid: number): OAppOmniGraphHardhat['connections'] {
    const conns = lzConfigAptos.connections

    const connections: OAppOmniGraphHardhat['connections'] = []

    for (const conn of conns) {
        if (conn[_key].eid == _eid) {
            connections.push(conn)
        }
    }

    return connections
}

export function getConfigConnectionsFromConfigConnections(
    conns: OAppOmniGraphHardhat['connections'],
    _key: string,
    _eid: number
): OAppOmniGraphHardhat['connections'] {
    const connections: OAppOmniGraphHardhat['connections'] = []

    for (const conn of conns) {
        if (conn[_key].eid == _eid) {
            connections.push(conn)
        }
    }

    return connections
}

export function getAccountConfig(): Record<number, OAppNodeConfig> {
    const conns = lzConfigAptos.contracts

    const configs: Record<number, OAppNodeConfig> = {}

    for (const conn of conns) {
        if (conn.config) {
            configs[conn.contract.eid] = conn.config
        } else {
            configs[conn.contract.eid] = {}
        }
    }

    return configs
}

export function diffPrinter(logObject: string, from: object, to: object) {
    const keyWidth = 30 // Fixed width for Key column
    const valueWidth = 72 // Fixed width for From and To columns
    const tableWidth = keyWidth + (valueWidth + 6) * 2 // Total table width (including separators)

    const pad = (str: string, width: number) => str.padEnd(width, ' ')

    const wrapText = (text: string, width: number) => {
        const lines = []
        let remaining = text
        while (remaining.length > width) {
            lines.push(remaining.slice(0, width))
            remaining = remaining.slice(width)
        }
        lines.push(remaining) // Add remaining text
        return lines
    }

    const allKeys = Array.from(new Set([...Object.keys(from), ...Object.keys(to)]))

    const header = `| ${pad('Key', keyWidth)} | ${pad('From', valueWidth)} | ${pad('To', valueWidth)} |`
    const separator = `|-${'-'.repeat(keyWidth)}-|-` + `${'-'.repeat(valueWidth)}-|-` + `${'-'.repeat(valueWidth)}-|`

    const rows = allKeys.flatMap((key) => {
        const fromValue = from[key] !== undefined ? String(from[key]) : ''
        const toValue = to[key] !== undefined ? String(to[key]) : ''

        const fromLines = wrapText(fromValue, valueWidth)
        const toLines = wrapText(toValue, valueWidth)
        const lineCount = Math.max(fromLines.length, toLines.length)

        // Create rows for each line of wrapped text
        const rowLines = []
        for (let i = 0; i < lineCount; i++) {
            const keyText = i === 0 ? pad(key, keyWidth) : pad('', keyWidth) // Only display key on the first row
            const fromText = pad(fromLines[i] || '', valueWidth)
            const toText = pad(toLines[i] || '', valueWidth)
            rowLines.push(`| ${keyText} | ${fromText} | ${toText} |`)
        }
        return rowLines
    })

    // Print the table
    const orangeLine = '\x1b[33m' + ` ${'-'.repeat(tableWidth - 2)} ` + '\x1b[0m'
    console.log('\n', logObject)
    console.log(orangeLine)
    console.log(` ${header} `)
    console.log(` ${separator} `)
    rows.forEach((row) => console.log(` ${row} `))
    console.log(orangeLine)
    console.log('\n')
}

export function getAptosOftAddress(stage: Stage) {
    const deploymentPath = path.join(__dirname, `../../deployments/aptos-${stage}/oft.json`)
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
