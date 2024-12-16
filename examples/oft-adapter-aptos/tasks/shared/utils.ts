import lzConfigAptos from '../../aptos.layerzero.config'
import hardhatConfig from '../../hardhat.config'

import type { OAppNodeConfig, OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'

export function createEidToNetworkMapping(_value = ''): Record<number, string> {
    const networks = hardhatConfig.networks ?? {}
    const eidNetworkNameMapping: Record<number, string> = {}
    for (const [networkName, networkConfig] of Object.entries(networks)) {
        if (_value === '') {
            eidNetworkNameMapping[networkConfig?.eid ?? 0] = networkName
        } else {
            // Cast networkConfig to any to avoid index signature error
            eidNetworkNameMapping[networkConfig?.eid ?? 0] = (networkConfig as any)?.[_value] ?? ''
        }
    }
    return eidNetworkNameMapping
}

export function getConfigConnections(_key: string, _eid: number): OAppOmniGraphHardhat['connections'] {
    const conns = lzConfigAptos.connections
    const connections: OAppOmniGraphHardhat['connections'] = []
    for (const conn of conns) {
        const endpoint = conn[_key as keyof typeof conn]
        if (endpoint && 'eid' in endpoint && endpoint.eid === _eid) {
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
        const endpoint = conn[_key as keyof typeof conn]
        if (endpoint && 'eid' in endpoint && endpoint.eid === _eid) {
            connections.push(conn)
        }
    }

    return connections
}

export function getHHAccountConfig(): Record<number, OAppNodeConfig> {
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

// @todo instead of constant width, change it to dynamic width based on terminal width.
export function diffPrinter(logObject: string, from: object, to: object) {
    const keyWidth = 30 // Fixed width for Key column
    const valueWidth = 72 // Fixed width for From and To columns
    const tableWidth = keyWidth + (valueWidth + 6) * 2 // Total table width (including separators)

    // Flatten nested objects/arrays into dot notation
    const flatten = (obj: any, prefix = ''): Record<string, string> => {
        return Object.keys(obj).reduce((acc: Record<string, string>, key: string) => {
            const value = obj[key]
            const newKey = prefix ? `${prefix}.${key}` : key

            if (Array.isArray(value)) {
                // Special case for empty arrays
                if (value.length === 0) {
                    acc[newKey] = '[]'
                } else {
                    // Handle arrays by creating indexed keys
                    value.forEach((item, index) => {
                        if (typeof item === 'object' && item !== null) {
                            Object.assign(acc, flatten(item, `${newKey}[${index}]`))
                        } else {
                            acc[`${newKey}[${index}]`] = String(item)
                        }
                    })
                }
            } else if (typeof value === 'object' && value !== null) {
                // Recursively flatten nested objects
                Object.assign(acc, flatten(value, newKey))
            } else {
                // Base case: primitive values
                acc[newKey] = String(value ?? '')
            }
            return acc
        }, {})
    }

    const flatFrom = flatten(from)
    const flatTo = flatten(to)

    // Remove empty array entries when the other side has array elements
    Object.keys({ ...flatFrom, ...flatTo }).forEach((key) => {
        if (
            (flatFrom[key] === '[]' && Object.keys(flatTo).some((k) => k.startsWith(`${key}[`))) ||
            (flatTo[key] === '[]' && Object.keys(flatFrom).some((k) => k.startsWith(`${key}[`)))
        ) {
            delete flatFrom[key]
            delete flatTo[key]
        }
    })

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

    const allKeys = Array.from(new Set([...Object.keys(flatFrom), ...Object.keys(flatTo)]))

    const orangeVertical = '\x1b[33m' + `|` + '\x1b[0m'

    const header = `${orangeVertical} ${pad('Key', keyWidth)} | ${pad('Current', valueWidth)} | ${pad('New', valueWidth)} ${orangeVertical}`
    const separator =
        `${orangeVertical}-${'-'.repeat(keyWidth)}-|-` +
        `${'-'.repeat(valueWidth)}-|-` +
        `${'-'.repeat(valueWidth)}-${orangeVertical}`

    const rows = allKeys.flatMap((key) => {
        const fromValue = flatFrom[key] !== undefined ? String(flatFrom[key]) : ''
        const toValue = flatTo[key] !== undefined ? String(flatTo[key]) : ''

        const fromLines = wrapText(fromValue, valueWidth)
        const toLines = wrapText(toValue, valueWidth)
        const lineCount = Math.max(fromLines.length, toLines.length)

        // Create rows for each line of wrapped text
        const rowLines = []
        for (let i = 0; i < lineCount; i++) {
            const keyText = i === 0 ? pad(key, keyWidth) : pad('', keyWidth) // Only display key on the first row
            const fromText = pad(fromLines[i] || '', valueWidth)
            const toText = pad(toLines[i] || '', valueWidth)
            rowLines.push(`${orangeVertical} ${keyText} | ${fromText} | ${toText} ${orangeVertical}`)
        }
        return rowLines
    })

    // Print the table
    const orangeLine = '\x1b[33m' + ` ${'-'.repeat(tableWidth - 2)} ` + '\x1b[0m'
    console.log(logObject)
    console.log(orangeLine)
    console.log(` ${header} `)
    console.log(` ${separator} `)
    rows.forEach((row) => console.log(` ${row} `))
    console.log(orangeLine, '\n')
}

export const ZEROADDRESS_EVM = '0x0000000000000000000000000000000000000000'
