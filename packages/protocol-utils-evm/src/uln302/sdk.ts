import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { IUln302, Uln302ExecutorConfig, Uln302UlnConfig } from '@layerzerolabs/protocol-utils'
import { Address, formatEid, type OmniTransaction } from '@layerzerolabs/utils'
import { omniContractToPoint, type OmniContract, makeZeroAddress } from '@layerzerolabs/utils-evm'
import { Uln302ExecutorConfigSchema, Uln302UlnConfigInputSchema, Uln302UlnConfigSchema } from './schema'

export class Uln302 implements IUln302 {
    constructor(public readonly contract: OmniContract) {}

    async getUlnConfig(eid: EndpointId, address?: Address | null | undefined): Promise<Uln302UlnConfig> {
        const config = await this.contract.contract.getUlnConfig(makeZeroAddress(address), eid)

        // Now we convert the ethers-specific object into the common structure
        //
        // Here we need to spread the config into an object because what ethers gives us
        // is actually an array with extra properties
        return Uln302UlnConfigSchema.parse({ ...config })
    }

    async getExecutorConfig(eid: EndpointId, address?: Address | null | undefined): Promise<Uln302ExecutorConfig> {
        const config = await this.contract.contract.getExecutorConfig(makeZeroAddress(address), eid)

        // Now we convert the ethers-specific object into the common structure
        //
        // Here we need to spread the config into an object because what ethers gives us
        // is actually an array with extra properties
        return Uln302ExecutorConfigSchema.parse({ ...config })
    }

    async setDefaultExecutorConfig(eid: EndpointId, config: Uln302ExecutorConfig): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('setDefaultExecutorConfigs', [
            [{ eid, config }],
        ])

        return this.createTransaction(data)
    }

    async setDefaultUlnConfig(eid: EndpointId, config: Uln302UlnConfig): Promise<OmniTransaction> {
        const serializedConfig = Uln302UlnConfigInputSchema.parse(config)
        const data = this.contract.contract.interface.encodeFunctionData('setDefaultUlnConfigs', [
            [
                {
                    eid,
                    config: serializedConfig,
                },
            ],
        ])

        return {
            ...this.createTransaction(data),
            description: `Setting default ULN config for ${formatEid(eid)}: ${JSON.stringify(serializedConfig)}`,
        }
    }

    protected createTransaction(data: string): OmniTransaction {
        return {
            point: omniContractToPoint(this.contract),
            data,
        }
    }
}
