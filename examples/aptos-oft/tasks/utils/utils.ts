import hardhatConfig from '../../hardhat.config'
import lzConfig from '../../aptos.layerzero.config'
import type { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'

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
    const conns = lzConfig.connections
    const connections: OAppOmniGraphHardhat['connections'] = []

    for (const conn of conns) {
        if (conn[_key].eid == _eid) {
            connections.push(conn)
        }
    }

    return connections
}

// create a mapping for Network.XXXXX to aptos eid - takes in AptosConfig and returns a mapping
