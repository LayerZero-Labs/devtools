import type { HardhatRuntimeEnvironment } from 'hardhat/types'
import type { ProviderFactory, RpcUrlFactory } from '@layerzerolabs/utils-evm'
import { createProviderFactory as createProviderFactoryBase } from '@layerzerolabs/utils-evm'
import { EndpointId } from '@layerzerolabs/lz-definitions'

export const createRpcUrlFactory = (hre: HardhatRuntimeEnvironment): RpcUrlFactory => {
    const networks = Object.values(hre.config.networks)
    const urlsByEndpointId: Map<EndpointId, string> = new Map(
        networks.flatMap((networkConfig) => {
            if (networkConfig.endpointId == null) return []

            return [[networkConfig.endpointId, networkConfig.url]]
        })
    )

    return async (eid) => {
        const url = urlsByEndpointId.get(eid)
        if (url == null) throw new Error(`Missing RPC URL for eid ${eid}`)

        return url
    }
}

export const createProviderFactory = (hre: HardhatRuntimeEnvironment): ProviderFactory =>
    createProviderFactoryBase(createRpcUrlFactory(hre))
