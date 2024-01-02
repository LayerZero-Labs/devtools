import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { IUln302, Uln302ExecutorConfig, Uln302UlnConfig } from '@layerzerolabs/protocol-devtools'
import { Address, formatEid, type OmniTransaction } from '@layerzerolabs/devtools'
import { makeZeroAddress, OmniSDK } from '@layerzerolabs/devtools-evm'
import { Uln302ExecutorConfigSchema, Uln302UlnConfigInputSchema, Uln302UlnConfigSchema } from './schema'
import assert from 'assert'
import { printRecord } from '@layerzerolabs/io-devtools'

export class Uln302 extends OmniSDK implements IUln302 {
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

    decodeExecutorConfig(executorConfigBytes: string): Uln302ExecutorConfig {
        const [rtnConfig] = this.contract.contract.interface.decodeFunctionResult(
            'getExecutorConfig',
            executorConfigBytes
        )

        return Uln302ExecutorConfigSchema.parse({ ...rtnConfig })
    }

    encodeExecutorConfig(config: Uln302ExecutorConfig): string {
        const encoded = this.contract.contract.interface.encodeFunctionResult('getExecutorConfig', [config])

        return assert(typeof encoded === 'string', 'Must be a string'), encoded
    }

    decodeUlnConfig(ulnConfigBytes: string): Uln302UlnConfig {
        const [rtnConfig] = this.contract.contract.interface.decodeFunctionResult('getUlnConfig', ulnConfigBytes)

        return Uln302UlnConfigSchema.parse({ ...rtnConfig })
    }

    encodeUlnConfig(config: Uln302UlnConfig): string {
        const serializedConfig = Uln302UlnConfigInputSchema.parse(config)
        const encoded = this.contract.contract.interface.encodeFunctionResult('getUlnConfig', [serializedConfig])

        return assert(typeof encoded === 'string', 'Must be a string'), encoded
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
            description: `Setting default ULN config for ${formatEid(eid)}: ${printRecord(serializedConfig)}`,
        }
    }
}
