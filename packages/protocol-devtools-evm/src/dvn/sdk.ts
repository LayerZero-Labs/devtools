import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { IDVN, DVNDstConfig } from '@layerzerolabs/protocol-devtools'
import { formatEid, type OmniTransaction } from '@layerzerolabs/devtools'
import { OmniSDK } from '@layerzerolabs/devtools-evm'
import { printRecord } from '@layerzerolabs/io-devtools'
import { DVNDstConfigSchema } from './schema'

export class DVN extends OmniSDK implements IDVN {
    async getDstConfig(eid: EndpointId): Promise<DVNDstConfig> {
        const config = await this.contract.contract.dstConfig(eid)

        // Now we convert the ethers-specific object into the common structure
        //
        // Here we need to spread the config into an object because what ethers gives us
        // is actually an array with extra properties
        return DVNDstConfigSchema.parse({ ...config })
    }

    async setDstConfig(eid: EndpointId, value: DVNDstConfig): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('setDstConfig', [
            [
                {
                    dstEid: eid,
                    gas: value.gas,
                    multiplierBps: value.multiplierBps,
                    floorMarginUSD: value.floorMarginUSD,
                },
            ],
        ])

        return {
            ...this.createTransaction(data),
            description: `Setting dstConfig for ${formatEid(eid)}: ${printRecord(value)}`,
        }
    }
}
