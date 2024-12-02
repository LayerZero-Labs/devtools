import hardhatConfig from '../../hardhat.config'
import lzConfigAptos from '../../aptos.layerzero.config'
import type { OAppNodeConfig, OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions-v3'
import { Aptos, InputGenerateTransactionPayloadData, Network } from '@aptos-labs/ts-sdk'
import { Stage } from '@layerzerolabs/lz-definitions-v3'
import { loadAptosYamlConfig } from './config'
import path from 'path'
import * as fs from 'fs'
import { OFT } from '../../sdk/oft'

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
    const keyWidth = 20 // Fixed width for Key column
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
}

export function getLzNetworkStage(network: Network): Stage {
    if (network === Network.MAINNET) {
        return Stage.MAINNET
    } else if (network === Network.TESTNET) {
        return Stage.TESTNET
    } else if (network === Network.CUSTOM) {
        return Stage.SANDBOX
    } else {
        throw new Error(`Unsupported network: ${network}`)
    }
}

export function getEndpointId(network: Network, chainName: string): number {
    if (chainName.toLowerCase() !== 'aptos') {
        throw new Error('Unsupported chain')
    }

    if (network === Network.MAINNET || network.toLowerCase() === 'mainnet') {
        return EndpointId.APTOS_V2_MAINNET
    } else if (network === Network.TESTNET || network.toLowerCase() === 'testnet') {
        return EndpointId.APTOS_V2_TESTNET
    } else if (network === Network.CUSTOM || network.toLowerCase() === 'sandbox') {
        return EndpointId.APTOS_V2_SANDBOX
    } else {
        throw new Error(`Unsupported network: ${network}`)
    }
}

export function getAptosOftAddress(stage: Stage) {
    const deploymentPath = path.join(__dirname, `../../deployments/aptos-${stage}/oft.json`)
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))
    return deployment.address
}

export async function parseYaml(): Promise<{
    account_address: string
    private_key: string
    network: Network
    fullnode: string
    faucet: string
}> {
    const aptosYamlConfig = await loadAptosYamlConfig()

    const account_address = aptosYamlConfig.profiles.default.account
    const private_key = aptosYamlConfig.profiles.default.private_key
    const network = aptosYamlConfig.profiles.default.network.toLowerCase() as Network
    const fullnode = aptosYamlConfig.profiles.default.rest_url
    const faucet = aptosYamlConfig.profiles.default.faucet_url

    return { account_address, private_key, network, fullnode, faucet }
}

export async function sendAllTxs(
    aptos: Aptos,
    oft: OFT,
    account_address: string,
    txs: InputGenerateTransactionPayloadData[]
) {
    const accountInfo = await aptos.getAccountInfo({ accountAddress: account_address })
    let sequenceNumber = parseInt(accountInfo.sequence_number)

    console.log('\n📦 Transaction Batch Summary:')
    console.log(`   • Total transactions: ${txs.length}`)
    console.log(`   • Starting sequence: ${sequenceNumber}\n`)

    for (let i = 0; i < txs.length; i++) {
        const progress = `[${i + 1}/${txs.length}]`
        console.log(`🔄 ${progress} Processing transaction ${sequenceNumber}...`)

        const trans = await aptos.transaction.build.simple({
            sender: account_address,
            data: txs[i],
        })
        await oft.signSubmitAndWaitForTx(trans)

        console.log(`✅ ${progress} Transaction ${sequenceNumber} completed\n`)
        sequenceNumber++
    }

    console.log('🎉 Batch Transaction Summary:')
    console.log(`   • ${txs.length} transactions processed successfully`)
    console.log(`   • Final sequence: ${sequenceNumber - 1}\n`)
}
