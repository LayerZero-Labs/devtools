import hardhatConfig from '../../hardhat.config'

export function createEidToNetworkMapping() {
    const networks = hardhatConfig.networks

    const eidNetworkNameMapping: Record<number, string> = {}
    for (const [networkName, networkConfig] of Object.entries(networks)) {
        eidNetworkNameMapping[networkConfig.eid] = networkName
    }

    console.log(eidNetworkNameMapping)
    return eidNetworkNameMapping
}
