import path from 'path'

import { endpointIdToNetwork } from '@layerzerolabs/lz-definitions'
import { Options } from '@layerzerolabs/lz-v2-utilities'

import type { OmniPointHardhat } from '@layerzerolabs/devtools-evm-hardhat'
import type { HardhatRuntimeEnvironment } from 'hardhat/types'

export const deploymentMetadataUrl = 'https://metadata.layerzero-api.com/v1/metadata/deployments'

/**
 * Given a srcEid and on-chain tx hash, return
 * `https://…blockExplorers[0].url/tx/<txHash>`, or undefined.
 */
export async function getBlockExplorerLink(srcEid: number, txHash: string): Promise<string | undefined> {
    const network = endpointIdToNetwork(srcEid) // e.g. "ethereum-mainnet"
    const res = await fetch(deploymentMetadataUrl)
    if (!res.ok) return
    const all = (await res.json()) as Record<string, { blockExplorers?: { url: string }[] }>
    const meta = all[network]
    const explorer = meta?.blockExplorers?.[0]?.url
    if (explorer) {
        // many explorers use `/tx/<hash>`
        return `${explorer.replace(/\/+$/, '')}/tx/${txHash}`
    }
    return
}

function formatBigIntForDisplay(n: bigint) {
    return n.toLocaleString().replace(/,/g, '_')
}

export function decodeLzReceiveOptions(hex: string): string {
    try {
        // Handle empty/undefined values first
        if (!hex || hex === '0x') return 'No options set'
        const options = Options.fromOptions(hex)
        const lzReceiveOpt = options.decodeExecutorLzReceiveOption()
        return lzReceiveOpt
            ? `gas: ${formatBigIntForDisplay(lzReceiveOpt.gas)} , value: ${formatBigIntForDisplay(lzReceiveOpt.value)} wei`
            : 'No executor options'
    } catch (e) {
        return `Invalid options (${hex.slice(0, 12)}...)`
    }
}

// Get LayerZero scan link
export function getLayerZeroScanLink(txHash: string, isTestnet = false): string {
    const baseUrl = isTestnet ? 'https://testnet.layerzeroscan.com' : 'https://layerzeroscan.com'
    return `${baseUrl}/tx/${txHash}`
}

export { DebugLogger, KnownErrors, KnownOutputs, KnownWarnings } from '@layerzerolabs/io-devtools'

/**
 * Get OApp contract info by EID from LayerZero config
 */
export async function getOAppInfoByEid(
    eid: number,
    oappConfig: string,
    hre: HardhatRuntimeEnvironment,
    overrideAddress?: string
): Promise<{ address: string; contractName?: string }> {
    if (overrideAddress) {
        return { address: overrideAddress }
    }

    const layerZeroConfig = (await import(path.resolve('./', oappConfig))).default
    const { contracts } = typeof layerZeroConfig === 'function' ? await layerZeroConfig() : layerZeroConfig
    const wrapper = contracts.find((c: { contract: OmniPointHardhat }) => c.contract.eid === eid)
    if (!wrapper) throw new Error(`No config for EID ${eid}`)

    const contractName = wrapper.contract.contractName
    const address = contractName ? (await hre.deployments.get(contractName)).address : wrapper.contract.address || ''

    return { address, contractName }
}

/**
 * Resolve OFT addresses for src/dst EIDs using the LayerZero config or an override.
 * Returns only addresses to keep call sites simple.
 */
export async function getOftAddresses(
    srcEid: number,
    dstEid: number,
    oappConfig: string,
    getHreByEid: (eid: number) => Promise<HardhatRuntimeEnvironment>,
    overrideAddress?: string
): Promise<{ srcOft: string; dstOft: string }> {
    const [srcHre, dstHre] = await Promise.all([getHreByEid(srcEid), getHreByEid(dstEid)])
    const [srcInfo, dstInfo] = await Promise.all([
        getOAppInfoByEid(srcEid, oappConfig, srcHre, overrideAddress),
        getOAppInfoByEid(dstEid, oappConfig, dstHre, overrideAddress),
    ])
    return { srcOft: srcInfo.address, dstOft: dstInfo.address }
}
