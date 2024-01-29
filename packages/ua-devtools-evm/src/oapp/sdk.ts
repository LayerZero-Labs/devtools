import type { IOApp, EnforcedOptions, OAppEnforcedOptionConfig } from '@layerzerolabs/ua-devtools'
import { type Bytes32, type Address, type OmniTransaction, formatEid } from '@layerzerolabs/devtools'
import {
    type OmniContract,
    ignoreZero,
    makeBytes32,
    areBytes32Equal,
    isZero,
    formatOmniContract,
} from '@layerzerolabs/devtools-evm'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { EndpointFactory, IEndpoint } from '@layerzerolabs/protocol-devtools'
import { OmniSDK } from '@layerzerolabs/devtools-evm'
import { printJson } from '@layerzerolabs/io-devtools'
import { ExecutorOptionType, Options } from '@layerzerolabs/lz-v2-utilities'

export class OApp extends OmniSDK implements IOApp {
    constructor(
        contract: OmniContract,
        protected readonly endpointFactory: EndpointFactory
    ) {
        super(contract)
    }

    async getEndpointSDK(): Promise<IEndpoint> {
        this.logger.debug(`Getting EndpointV2 SDK`)

        let address: string

        // First we'll need the endpoint address from the contract
        try {
            address = await this.contract.contract.endpoint()
        } catch (error) {
            // We'll just wrap the error in some nice words
            throw new Error(`Failed to get endpoint address for OApp ${formatOmniContract(this.contract)}: ${error}`)
        }

        // We'll also do an additional check to see whether the endpoint has been set to a non-zero address
        if (isZero(address)) {
            throw new Error(
                `Endpoint cannot be instantiated: Endpoint address has been set to a zero value for OApp ${formatOmniContract(
                    this.contract
                )}`
            )
        }

        this.logger.debug(`Got EndpointV2 address: ${address}`)

        return await this.endpointFactory({ address, eid: this.contract.eid })
    }

    async getPeer(eid: EndpointId): Promise<Bytes32 | undefined> {
        this.logger.debug(`Getting peer for eid ${eid} (${formatEid(eid)})`)

        return ignoreZero(await this.contract.contract.peers(eid))
    }

    async hasPeer(eid: EndpointId, address: Bytes32 | Address | null | undefined): Promise<boolean> {
        return areBytes32Equal(await this.getPeer(eid), address)
    }

    async setPeer(eid: EndpointId, address: Bytes32 | Address | null | undefined): Promise<OmniTransaction> {
        this.logger.debug(`Setting peer for eid ${eid} (${formatEid(eid)}) to address ${makeBytes32(address)}`)

        const data = this.contract.contract.interface.encodeFunctionData('setPeer', [eid, makeBytes32(address)])
        return {
            ...this.createTransaction(data),
            description: `Setting peer for eid ${eid} (${formatEid(eid)}) to address ${makeBytes32(address)}`,
        }
    }

    async getEnforcedOptions(eid: EndpointId, msgType: number): Promise<string> {
        this.logger.debug(`Getting enforced options for eid ${eid} (${formatEid(eid)}) and message type ${msgType}`)

        return await this.contract.contract.enforcedOptions(eid, msgType)
    }

    async setEnforcedOptions(enforcedOptions: EnforcedOptions[]): Promise<OmniTransaction> {
        this.logger.debug(`Setting enforced options to ${printJson(enforcedOptions)}`)

        const data = this.contract.contract.interface.encodeFunctionData('setEnforcedOptions', [enforcedOptions])
        return {
            ...this.createTransaction(data),
            description: `Setting enforced options to ${printJson(enforcedOptions)}`,
        }
    }

    encodeEnforcedOptions(enforcedOptionConfig: OAppEnforcedOptionConfig): Options {
        if ('options' in enforcedOptionConfig) return Options.fromOptions(enforcedOptionConfig.options)

        if (enforcedOptionConfig.msgType == ExecutorOptionType.LZ_RECEIVE) {
            return Options.newOptions().addExecutorLzReceiveOption(enforcedOptionConfig.gas, enforcedOptionConfig.value)
        } else if (enforcedOptionConfig.msgType == ExecutorOptionType.NATIVE_DROP) {
            return Options.newOptions().addExecutorNativeDropOption(
                enforcedOptionConfig.amount,
                enforcedOptionConfig.receiver
            )
        } else if (enforcedOptionConfig.msgType == ExecutorOptionType.COMPOSE) {
            return Options.newOptions().addExecutorComposeOption(
                enforcedOptionConfig.index,
                enforcedOptionConfig.gas,
                enforcedOptionConfig.value
            )
        } else if (enforcedOptionConfig.msgType == ExecutorOptionType.ORDERED) {
            return Options.newOptions().addExecutorOrderedExecutionOption()
        } else {
            throw new Error(`Invalid ExecutorOptionType`)
        }
    }
}
