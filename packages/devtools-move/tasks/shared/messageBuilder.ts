import { getNetworkForChainId } from '@layerzerolabs/lz-definitions'

enum ConfigType {
    EXECUTOR = 1,
    SEND_ULN = 2,
    RECV_ULN = 3,
}

const configTypeToNameMap = {
    [ConfigType.SEND_ULN]: 'Send',
    [ConfigType.RECV_ULN]: 'Receive',
    [ConfigType.EXECUTOR]: 'Executor',
}

export function createDiffMessage(elementDesc: string, fromEid: number, toEid: number) {
    const toNetwork = getNetworkForChainId(toEid)
    const fromNetwork = getNetworkForChainId(fromEid)
    return `Set ${elementDesc} for pathway ${fromNetwork.chainName}-${fromNetwork.env} → ${toNetwork.chainName}-${toNetwork.env}`
}

export function printAlreadySet(configObject: string, fromEid: number, toEid: number) {
    const toNetwork = getNetworkForChainId(toEid)
    const fromNetwork = getNetworkForChainId(fromEid)
    console.log(
        `✅ ${configObject} already set or pathway ${fromNetwork.chainName}-${fromNetwork.env} → ${toNetwork.chainName}-${toNetwork.env}\n`
    )
}

export function printNotSet(configObject: string, fromEid: number, toEid: number) {
    const toNetwork = getNetworkForChainId(toEid)
    const fromNetwork = getNetworkForChainId(fromEid)
    console.log(
        `No ${configObject} specified for pathway ${fromNetwork.chainName}-${fromNetwork.env} → ${toNetwork.chainName}-${toNetwork.env}\n`
    )
}

export function createWarningMessage(configType: ConfigType, fromEid: number, toEid: number) {
    const fromNetwork = getNetworkForChainId(fromEid)
    const toNetwork = getNetworkForChainId(toEid)
    return `⚠️ WARN: ${configTypeToNameMap[configType]} config for ${fromNetwork.chainName}-${fromNetwork.env} → ${toNetwork.chainName}-${toNetwork.env}`
}

export function buildTransactionDescription(action: string, fromEid: number, toEid: number): string {
    const fromNetwork = getNetworkForChainId(fromEid)
    const toNetwork = getNetworkForChainId(toEid)

    return `${action} from ${fromNetwork.chainName}-${fromNetwork.env} → ${toNetwork.chainName}-${toNetwork.env}`
}
