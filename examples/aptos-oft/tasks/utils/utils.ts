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
    const terminalWidth = process.stdout.columns || 80

    const boxWidth = terminalWidth - 2 // Subtract 2 for box edges

    const pad = (str: string, width: number) => str.padEnd(width, ' ')

    const allKeys = Array.from(new Set([...Object.keys(from), ...Object.keys(to)]))
    const columnWidths = {
        key: Math.max(...allKeys.map((key) => key.length), 8),
        from: Math.max(...Object.values(from).map((value) => String(value).length), 10),
        to: Math.max(...Object.values(to).map((value) => String(value).length), 10),
    }

    const header = `| ${pad('Key', columnWidths.key)} | ${pad('From', columnWidths.from)} | ${pad('To', columnWidths.to)} |`
    const separator =
        `|-${'-'.repeat(columnWidths.key)}-|-` +
        `${'-'.repeat(columnWidths.from)}-|-` +
        `${'-'.repeat(columnWidths.to)}-|`

    const rows = allKeys.map((key) => {
        const fromValue = from[key] !== undefined ? String(from[key]) : ''
        const toValue = to[key] !== undefined ? String(to[key]) : ''
        return `| ${pad(key, columnWidths.key)} | ${pad(fromValue, columnWidths.from)} | ${pad(toValue, columnWidths.to)} |`
    })

    console.log('\x1b[33m' + ` ${logObject.padEnd(boxWidth - 12, ' ')} ` + '\x1b[0m')
    console.log(` ${header.padEnd(boxWidth - 2, ' ')} `)
    console.log(` ${separator.padEnd(boxWidth - 2, ' ')} `)
    rows.forEach((row) => console.log(` ${row.padEnd(boxWidth - 2, ' ')} `))
    console.log('\x1b[33m' + ` ${'-'.repeat(boxWidth).padEnd(boxWidth, ' ')} ` + '\x1b[0m')
}
