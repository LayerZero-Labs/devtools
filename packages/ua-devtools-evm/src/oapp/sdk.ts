import type { IOApp, OAppEnforcedOptionParam } from '@layerzerolabs/ua-devtools'
import {
    type Bytes32,
    type OmniAddress,
    type OmniTransaction,
    formatEid,
    isZero,
    areBytes32Equal,
    ignoreZero,
    makeBytes32,
    Bytes,
} from '@layerzerolabs/devtools'
import { type OmniContract, formatOmniContract } from '@layerzerolabs/devtools-evm'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { EndpointV2Factory, IEndpointV2 } from '@layerzerolabs/protocol-devtools'
import { OmniSDK } from '@layerzerolabs/devtools-evm'
import { printJson } from '@layerzerolabs/io-devtools'

export class OApp extends OmniSDK implements IOApp {
    constructor(
        contract: OmniContract,
        protected readonly endpointV2Factory: EndpointV2Factory
    ) {
        super(contract)
    }

    async getEndpointSDK(): Promise<IEndpointV2> {
        this.logger.debug(`Getting EndpointV2 SDK`)

        let address: string

        // First we'll need the EndpointV2 address from the contract
        try {
            address = await this.contract.contract.endpoint()
        } catch (error) {
            // We'll just wrap the error in some nice words
            throw new Error(`Failed to get EndpointV2 address for OApp ${formatOmniContract(this.contract)}: ${error}`)
        }

        // We'll also do an additional check to see whether the EndpointV2 has been set to a non-zero address
        if (isZero(address)) {
            throw new Error(
                `EndpointV2 cannot be instantiated: EndpointV2 address has been set to a zero value for OApp ${formatOmniContract(
                    this.contract
                )}`
            )
        }

        this.logger.debug(`Got EndpointV2 address: ${address}`)

        return await this.endpointV2Factory({ address, eid: this.contract.eid })
    }

    async getPeer(eid: EndpointId): Promise<Bytes32 | undefined> {
        this.logger.debug(`Getting peer for eid ${eid} (${formatEid(eid)})`)

        return ignoreZero(await this.contract.contract.peers(eid))
    }

    async hasPeer(eid: EndpointId, address: OmniAddress | null | undefined): Promise<boolean> {
        return areBytes32Equal(await this.getPeer(eid), address)
    }

    async setPeer(eid: EndpointId, address: OmniAddress | null | undefined): Promise<OmniTransaction> {
        this.logger.debug(`Setting peer for eid ${eid} (${formatEid(eid)}) to address ${makeBytes32(address)}`)

        const data = this.contract.contract.interface.encodeFunctionData('setPeer', [eid, makeBytes32(address)])
        return {
            ...this.createTransaction(data),
            description: `Setting peer for eid ${eid} (${formatEid(eid)}) to address ${makeBytes32(address)}`,
        }
    }

    async getEnforcedOptions(eid: EndpointId, msgType: number): Promise<Bytes> {
        this.logger.debug(`Getting enforced options for eid ${eid} (${formatEid(eid)}) and message type ${msgType}`)

        return await this.contract.contract.enforcedOptions(eid, msgType)
    }

    async setEnforcedOptions(enforcedOptions: OAppEnforcedOptionParam[]): Promise<OmniTransaction> {
        this.logger.debug(`Setting enforced options to ${printJson(enforcedOptions)}`)
        const serializedConfig = this.serializeExecutorOptions(enforcedOptions)

        const data = this.contract.contract.interface.encodeFunctionData('setEnforcedOptions', [serializedConfig])
        return {
            ...this.createTransaction(data),
            description: `Setting enforced options to ${printJson(enforcedOptions)}`,
        }
    }

    /**
     * Prepares the Executor config to be sent to the contract
     *
     * @param {OAppEnforcedOptionParam[]} oappEnforcedOptionParam
     * @returns {SerializedEnforcedOptions[]}
     */
    protected serializeExecutorOptions(
        oappEnforcedOptionParam: OAppEnforcedOptionParam[]
    ): SerializedEnforcedOptions[] {
        return oappEnforcedOptionParam.map(({ eid, option: { msgType, options } }) => ({ eid, msgType, options }))
    }
}

/**
 * Helper type that matches the solidity implementation
 */
interface SerializedEnforcedOptions {
    eid: number
    msgType: number
    options: string
}
