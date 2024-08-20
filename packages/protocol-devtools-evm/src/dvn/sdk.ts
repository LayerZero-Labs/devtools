import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { IDVN, DVNDstConfig } from '@layerzerolabs/protocol-devtools'
import { formatEid, type OmniPoint, type OmniTransaction } from '@layerzerolabs/devtools'
import { OmniSDK, type Provider } from '@layerzerolabs/devtools-evm'
import { printJson } from '@layerzerolabs/io-devtools'
import { DVNDstConfigSchema } from './schema'
import { abi } from '@layerzerolabs/lz-evm-sdk-v2/artifacts/contracts/uln/dvn/DVN.sol/DVN.json'
import { Contract } from '@ethersproject/contracts'

export class DVN extends OmniSDK implements IDVN {
    constructor(provider: Provider, point: OmniPoint) {
        super({ eid: point.eid, contract: new Contract(point.address, abi).connect(provider) })
    }

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
            description: `Setting dstConfig for ${formatEid(eid)}: ${printJson(value)}`,
        }
    }
}
