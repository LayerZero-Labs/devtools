import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type {
    IUln302,
    Uln302ConfigType,
    Uln302ExecutorConfig,
    Uln302UlnConfig,
    Uln302UlnUserConfig,
} from '@layerzerolabs/protocol-devtools'
import {
    OmniAddress,
    formatEid,
    type OmniTransaction,
    compareBytes32Ascending,
    isDeepEqual,
    OmniPoint,
} from '@layerzerolabs/devtools'
import { Uln302ExecutorConfigSchema, Uln302UlnConfigSchema } from './schema'
import assert from 'assert'
import { printBoolean, printJson } from '@layerzerolabs/io-devtools'
import { isZero, AsyncRetriable } from '@layerzerolabs/devtools'
import { OmniSDK, Provider, addChecksum, makeZeroAddress } from '@layerzerolabs/devtools-evm'
import { Contract } from '@ethersproject/contracts'
// Although this SDK is not specific to SendUln302, it uses the SendUln302 ABI
// because it contains all the necessary method fragments
import { abi } from '@layerzerolabs/lz-evm-sdk-v2/artifacts/contracts/uln/uln302/SendUln302.sol/SendUln302.json'

export class Uln302 extends OmniSDK implements IUln302 {
    constructor(provider: Provider, point: OmniPoint) {
        super({ eid: point.eid, contract: new Contract(point.address, abi).connect(provider) })
    }

    /**
     * @see {@link IUln302.getUlnConfig}
     */
    @AsyncRetriable()
    async getUlnConfig(
        eid: EndpointId,
        address: OmniAddress | null | undefined,
        type: Uln302ConfigType
    ): Promise<Uln302UlnConfig> {
        this.logger.debug(
            `Getting ULN ${type} config for eid ${eid} (${formatEid(eid)}) and address ${makeZeroAddress(address)}`
        )

        const config = await this.contract.contract.getUlnConfig(makeZeroAddress(address), eid)
        // Now we convert the ethers-specific object into the common structure
        //
        // Here we need to spread the config into an object because what ethers gives us
        // is actually an array with extra properties
        const parsed = {
            confirmations: config.confirmations,
            requiredDVNs: config.requiredDVNs,
            optionalDVNs: config.optionalDVNs,
            optionalDVNThreshold: config.optionalDVNThreshold ?? 0,
        }
        return Uln302UlnConfigSchema.parse(parsed)
    }

    /**
     * @see {@link IUln302.getAppUlnConfig}
     */
    @AsyncRetriable()
    async getAppUlnConfig(eid: EndpointId, address: OmniAddress, type: Uln302ConfigType): Promise<Uln302UlnConfig> {
        this.logger.verbose(
            `Getting App ULN ${type} config for eid ${eid} (${formatEid(eid)}) and address ${makeZeroAddress(address)}`
        )

        if (isZero(address)) {
            this.logger.warn(
                `Getting App ULN ${type} config for eid ${eid} (${formatEid(eid)}): Passed in OApp address is zero. This will request the default config.`
            )
        }

        const config = await this.contract.contract.getAppUlnConfig(makeZeroAddress(address), eid)

        // Now we convert the ethers-specific object into the common structure
        //
        // Here we need to spread the config into an object because what ethers gives us
        // is actually an array with extra properties
        const parsed = {
            confirmations: config.confirmations,
            requiredDVNs: config.requiredDVNs,
            optionalDVNs: config.optionalDVNs,
            optionalDVNThreshold: config.optionalDVNThreshold ?? 0,
        }
        return Uln302UlnConfigSchema.parse(parsed)
    }

    /**
     * @see {@link IUln302.hasAppUlnConfig}
     */
    async hasAppUlnConfig(
        eid: EndpointId,
        oapp: string,
        config: Uln302UlnUserConfig,
        type: Uln302ConfigType
    ): Promise<boolean> {
        this.logger.verbose(
            `Checking whether ULN ${type} configs for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} match`
        )

        const currentConfig = await this.getAppUlnConfig(eid, oapp, type)
        const currentSerializedConfig = this.serializeUlnConfig(currentConfig)
        const serializedConfig = this.serializeUlnConfig(config)

        this.logger.debug(`Current ULN ${type} config: ${printJson(currentSerializedConfig)}`)
        this.logger.debug(`Incoming ULN ${type} config: ${printJson(serializedConfig)}`)

        const areEqual = isDeepEqual(serializedConfig, currentSerializedConfig)

        return this.logger.verbose(`Checked ULN ${type} configs: ${printBoolean(areEqual)}`), areEqual
    }

    /**
     * @see {@link IUln302.getExecutorConfig}
     */
    @AsyncRetriable()
    async getExecutorConfig(eid: EndpointId, address?: OmniAddress | null | undefined): Promise<Uln302ExecutorConfig> {
        this.logger.verbose(
            `Getting Executor config for eid ${eid} (${formatEid(eid)}) and address ${makeZeroAddress(address)}`
        )

        const config = await this.contract.contract.getExecutorConfig(makeZeroAddress(address), eid)

        // Now we convert the ethers-specific object into the common structure
        //
        // Here we need to spread the config into an object because what ethers gives us
        // is actually an array with extra properties
        return Uln302ExecutorConfigSchema.parse({ ...config })
    }

    /**
     * @see {@link IUln302.getAppExecutorConfig}
     */
    @AsyncRetriable()
    async getAppExecutorConfig(eid: EndpointId, address: OmniAddress): Promise<Uln302ExecutorConfig> {
        this.logger.verbose(
            `Getting App Executor config for eid ${eid} (${formatEid(eid)}) and address ${makeZeroAddress(address)}`
        )

        const config = await this.contract.contract.executorConfigs(makeZeroAddress(address), eid)

        if (isZero(address)) {
            this.logger.warn(
                `Getting App Executor config for eid ${eid} (${formatEid(eid)}): Passed in OApp address is zero. This will request the default config.`
            )
        }

        // Now we convert the ethers-specific object into the common structure
        //
        // Here we need to spread the config into an object because what ethers gives us
        // is actually an array with extra properties
        return Uln302ExecutorConfigSchema.parse({ ...config })
    }

    /**
     * @see {@link IUln302.hasAppExecutorConfig}
     */
    async hasAppExecutorConfig(eid: EndpointId, oapp: OmniAddress, config: Uln302ExecutorConfig): Promise<boolean> {
        this.logger.debug(`Checking whether Executor configs for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} match`)

        const currentConfig = await this.getAppExecutorConfig(eid, oapp)
        const currentSerializedConfig = this.serializeExecutorConfig(currentConfig)
        const serializedConfig = this.serializeExecutorConfig(config)

        this.logger.debug(`Current Executor config: ${printJson(currentSerializedConfig)}`)
        this.logger.debug(`Incoming Executor config: ${printJson(serializedConfig)}`)

        const areEqual = isDeepEqual(serializedConfig, currentSerializedConfig)

        return this.logger.verbose(`Checked App Executor configs: ${printBoolean(areEqual)}`), areEqual
    }

    /**
     * @see {@link IUln302.setDefaultExecutorConfig}
     */
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

        const parsed = {
            confirmations: rtnConfig.confirmations,
            requiredDVNs: rtnConfig.requiredDVNs,
            optionalDVNs: rtnConfig.optionalDVNs,
            optionalDVNThreshold: rtnConfig.optionalDVNThreshold ?? 0,
        }
        return Uln302UlnConfigSchema.parse(parsed)
    }

    encodeUlnConfig(config: Uln302UlnUserConfig): string {
        const serializedConfig = this.serializeUlnConfig(config)
        const encoded = this.contract.contract.interface.encodeFunctionResult('getUlnConfig', [serializedConfig])

        return assert(typeof encoded === 'string', 'Must be a string'), encoded
    }

    async setDefaultUlnConfig(eid: EndpointId, config: Uln302UlnUserConfig): Promise<OmniTransaction> {
        const serializedConfig = this.serializeUlnConfig(config)
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
            description: `Setting default ULN config for ${formatEid(eid)}: ${printJson(serializedConfig)}`,
        }
    }

    /**
     * Prepares the ULN config to be sent to the contract
     *
     * This involves adding two properties that are required by the EVM
     * contracts (for optimization purposes) but don't need to be present
     * in our configuration and ensuring correct checksum on the DVN addresses.
     *
     * @param {Uln302UlnUserConfig} config
     * @returns {SerializedUln302UlnConfig}
     */
    protected serializeUlnConfig({
        confirmations = BigInt(0),
        requiredDVNs,
        optionalDVNs = [],
        optionalDVNThreshold = 0,
    }: Uln302UlnUserConfig): SerializedUln302UlnConfig {
        return {
            confirmations,
            optionalDVNThreshold,
            requiredDVNs: requiredDVNs.map(addChecksum).sort(compareBytes32Ascending),
            optionalDVNs: optionalDVNs.map(addChecksum).sort(compareBytes32Ascending),
            requiredDVNCount: requiredDVNs.length,
            optionalDVNCount: optionalDVNs.length,
        }
    }

    /**
     * Prepares the Executor config to be sent to the contract
     *
     * @param {Uln302ExecutorConfig} config
     * @returns {SerializedUln302ExecutorConfig}
     */
    protected serializeExecutorConfig({
        maxMessageSize,
        executor,
    }: Uln302ExecutorConfig): SerializedUln302ExecutorConfig {
        return {
            maxMessageSize,
            executor: addChecksum(executor),
        }
    }
}

/**
 * Helper type that matches the expected UlnConfig type for the solicity implementation
 */
interface SerializedUln302UlnConfig extends Uln302UlnConfig {
    requiredDVNCount: number
    optionalDVNCount: number
}

/**
 * For reasons of symmetry we'll add a type for serialized `Uln302ExecutorConfig`,
 * even though it totally matches the `Uln302ExecutorConfig` type
 */
type SerializedUln302ExecutorConfig = Uln302ExecutorConfig
