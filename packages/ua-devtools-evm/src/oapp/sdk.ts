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
import { mapError } from '@layerzerolabs/devtools'
import { OwnableMixin } from '@/ownable/mixin'

export class OApp extends OmniSDK implements IOApp {
    constructor(
        contract: OmniContract,
        protected readonly endpointV2Factory: EndpointV2Factory
    ) {
        super(contract)
    }

    getOwner(): Promise<string> {
        // TODO This is a quick and dirty way of applying OwnableMixin
        //
        // The proper solution involves :
        // - Option A: Using class decorators
        // - Option B: Using dynamic classes
        //
        // TypeScript support for these is still lacking and the resulting code would slow
        // down the development at this point
        return OwnableMixin.getOwner.call(this)
    }

    hasOwner(address: string): Promise<boolean> {
        // TODO This is a quick and dirty way of applying OwnableMixin
        //
        // The proper solution involves :
        // - Option A: Using class decorators
        // - Option B: Using dynamic classes
        //
        // TypeScript support for these is still lacking and the resulting code would slow
        // down the development at this point
        return OwnableMixin.hasOwner.call(this, address)
    }

    setOwner(address: string): Promise<OmniTransaction> {
        // TODO This is a quick and dirty way of applying OwnableMixin
        //
        // The proper solution involves :
        // - Option A: Using class decorators
        // - Option B: Using dynamic classes
        //
        // TypeScript support for these is still lacking and the resulting code would slow
        // down the development at this point
        return OwnableMixin.setOwner.call(this, address)
    }

    async getEndpointSDK(): Promise<IEndpointV2> {
        this.logger.debug(`Getting EndpointV2 SDK`)

        const address = await mapError(
            () => this.contract.contract.endpoint(),
            (error) => new Error(`Failed to get EndpointV2 address for OApp ${this.label}: ${error}`)
        )

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
        const eidLabel = `eid ${eid} (${formatEid(eid)})`

        this.logger.debug(`Getting peer for ${eidLabel}`)
        const peer = await mapError(
            () => this.contract.contract.peers(eid),
            (error) => new Error(`Failed to get peer for ${eidLabel} for OApp ${this.label}: ${error}`)
        )

        return ignoreZero(peer)
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

    async getDelegate(): Promise<OmniAddress | undefined> {
        this.logger.debug(`Getting delegate`)

        const endpointSdk = await this.getEndpointSDK()
        const delegate = await mapError(
            () => endpointSdk.getDelegate(this.contract.contract.address),
            (error) => new Error(`Failed to get delegate for OApp ${this.label}: ${error}`)
        )

        return this.logger.debug(delegate ? `Got delegate ${delegate}` : `OApp has no delegate`), delegate
    }

    async isDelegate(delegate: OmniAddress): Promise<boolean> {
        this.logger.debug(`Checking whether ${delegate} is a delegate`)

        const endpointSdk = await this.getEndpointSDK()
        const isDelegate = await mapError(
            () => endpointSdk.isDelegate(this.contract.contract.address, delegate),
            (error) => new Error(`Failed to check delegate for OApp ${this.label}: ${error}`)
        )

        return this.logger.debug(`${delegate} ${isDelegate ? 'is a delegate' : 'is not a delegate'}`), isDelegate
    }

    async setDelegate(delegate: OmniAddress): Promise<OmniTransaction> {
        const description = `Setting delegate to ${delegate}`
        this.logger.debug(description)

        const data = this.contract.contract.interface.encodeFunctionData('setDelegate', [delegate])
        return {
            ...this.createTransaction(data),
            description,
        }
    }

    async getEnforcedOptions(eid: EndpointId, msgType: number): Promise<Bytes> {
        const eidLabel = `eid ${eid} (${formatEid(eid)})`

        this.logger.debug(`Getting enforced options for ${eidLabel} and message type ${msgType}`)

        return await mapError(
            () => this.contract.contract.enforcedOptions(eid, msgType),
            (error) =>
                new Error(
                    `Failed to get peer for ${eidLabel} and message type ${msgType} for OApp ${this.label}: ${error}`
                )
        )
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
