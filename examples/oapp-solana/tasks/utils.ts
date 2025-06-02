import { EndpointId } from '@layerzerolabs/lz-definitions'

export const getLayerZeroScanLink = (hash: string, isTestnet = false) =>
    isTestnet ? `https://testnet.layerzeroscan.com/tx/${hash}` : `https://layerzeroscan.com/tx/${hash}`

export const isV2Testnet = (eid: EndpointId) => eid >= 10000 && eid.toString()[0] === '4'
