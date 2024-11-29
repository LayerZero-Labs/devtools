import hardhatConfig from '../../hardhat.config'
import lzConfigAptos from '../../aptos.layerzero.config'
import type { OAppNodeConfig, OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'

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

    // eidNetworkNameMapping[50008] = 'aptos-mainnet'

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
