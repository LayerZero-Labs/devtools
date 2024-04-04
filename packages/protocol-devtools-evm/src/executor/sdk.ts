import type { EndpointId } from '@layerzerolabs/lz-definitions'
import {
    type IExecutor,
    type ExecutorDstConfig,
    ExecutorDstConfigPre2_1_27Schema,
    ExecutorDstConfigPost2_1_27Schema,
} from '@layerzerolabs/protocol-devtools'
import { formatEid, type OmniTransaction } from '@layerzerolabs/devtools'
import { OmniSDK } from '@layerzerolabs/devtools-evm'
import { printJson } from '@layerzerolabs/io-devtools'
import { ExecutorDstConfigSchema } from './schema'

export class Executor extends OmniSDK implements IExecutor {
    async getDstConfig(eid: EndpointId): Promise<ExecutorDstConfig> {
        const config = await this.contract.contract.dstConfig(eid)

        // Now we convert the ethers-specific object into the common structure
        //
        // Here we need to spread the config into an object because what ethers gives us
        // is actually an array with extra properties
        return ExecutorDstConfigSchema.parse({ ...config })
    }

    async setDstConfig(eid: EndpointId, value: ExecutorDstConfig): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('setDstConfig', [
            [this.serializeExecutorConfig(eid, value)],
        ])

        return {
            ...this.createTransaction(data),
            description: `Setting dstConfig for ${formatEid(eid)}: ${printJson(value)}`,
        }
    }

    private serializeExecutorConfig(eid: EndpointId, value: ExecutorDstConfig) {
        if (ExecutorDstConfigPre2_1_27Schema.safeParse(value)) {
            return {
                dstEid: eid,
                baseGas: value.baseGas,
                multiplierBps: value.multiplierBps,
                floorMarginUSD: value.floorMarginUSD,
                nativeCap: value.nativeCap,
            }
        }

        if (ExecutorDstConfigPost2_1_27Schema.safeParse(value)) {
            return {
                dstEid: eid,
                baseGas: value.baseGas,
                multiplierBps: value.multiplierBps,
                floorMarginUSD: value.floorMarginUSD,
                nativeCap: value.nativeCap,
            }
        }

        throw new Error(`Failed to serialize ExecutorConfig for ${this.label}: ${printJson(value)}`)
    }
}
