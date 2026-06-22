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

// A value used to indicate that no DVNs are required. It has to be used instead of 0, because 0 falls back to default value.
const NIL_DVN_COUNT = (1 << 8) - 1 // type(uint8).max = 255
// A value used to indicate that no confirmations are required. It has to be used instead of 0, because 0 falls back to default value.
const NIL_CONFIRMATIONS = (BigInt(1) << BigInt(64)) - BigInt(1) // type(uint64).max

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
            requiredDVNCount: config.requiredDVNCount,
            optionalDVNs: config.optionalDVNs,
            optionalDVNCount: config.optionalDVNCount,
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
            requiredDVNCount: config.requiredDVNCount,
            optionalDVNs: config.optionalDVNs,
            optionalDVNCount: config.optionalDVNCount,
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
        const currentSerializedConfig = this.normalizeUlnConfig(currentConfig)
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
            requiredDVNCount: rtnConfig.requiredDVNCount,
            optionalDVNs: rtnConfig.optionalDVNs,
            optionalDVNCount: rtnConfig.optionalDVNCount,
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
        // The library-wide DEFAULT config stores literal values and rejects NIL sentinels,
        // so we serialize without the empty → NIL mapping.
        const serializedConfig = this.serializeUlnConfig(config, false)
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
    protected serializeUlnConfig(
        { confirmations, requiredDVNs, requiredDVNCount, optionalDVNs, optionalDVNThreshold = 0 }: Uln302UlnUserConfig,
        /**
         * Whether to encode explicitly-empty fields as NIL sentinels.
         *
         * For an OApp config this must be `true`: an omitted field inherits the
         * on-chain default (stored as `0`), whereas an explicitly-empty field
         * (`confirmations: 0n`, `requiredDVNs: []`, `optionalDVNs: []`) pins the
         * literal zero/none via a NIL sentinel.
         *
         * For the library-wide DEFAULT config this must be `false`: the contract
         * rejects NIL sentinels there (see `setDefaultUlnConfigs`), so empty/zero
         * values must stay literal.
         */
        useNilSentinels = true
    ): SerializedUln302UlnConfig {
        // requiredDVNs is mandatory on the user config, so the only signal is empty vs non-empty.
        // An explicit count override always wins.
        const resolvedRequiredDVNCount =
            requiredDVNCount ?? (requiredDVNs.length > 0 ? requiredDVNs.length : useNilSentinels ? NIL_DVN_COUNT : 0)

        // optionalDVNs is optional, so we distinguish omitted (undefined → inherit default)
        // from explicitly empty (`[]` → pin "no optional DVNs" via NIL).
        const resolvedOptionalDVNCount =
            optionalDVNs == null
                ? 0
                : optionalDVNs.length > 0
                  ? optionalDVNs.length
                  : useNilSentinels
                    ? NIL_DVN_COUNT
                    : 0

        // The contract requires the threshold to be 0 unless there are concrete optional DVNs.
        const hasConcreteOptionalDVNs = resolvedOptionalDVNCount !== 0 && resolvedOptionalDVNCount !== NIL_DVN_COUNT

        return {
            confirmations:
                confirmations == null
                    ? BigInt(0)
                    : confirmations === BigInt(0) && useNilSentinels
                      ? NIL_CONFIRMATIONS
                      : confirmations,
            optionalDVNThreshold: hasConcreteOptionalDVNs ? optionalDVNThreshold : 0,
            requiredDVNs: requiredDVNs.map(addChecksum).sort(compareBytes32Ascending),
            optionalDVNs: (optionalDVNs ?? []).map(addChecksum).sort(compareBytes32Ascending),
            requiredDVNCount: resolvedRequiredDVNCount,
            optionalDVNCount: resolvedOptionalDVNCount,
        }
    }

    /**
     * Normalizes a ULN config read from the chain into the same shape `serializeUlnConfig`
     * produces, WITHOUT applying the empty → NIL mapping.
     *
     * The on-chain struct already carries resolved values — `0`/empty means "inherit
     * default", a NIL sentinel means "explicitly none". Re-applying the user-config NIL
     * mapping here would rewrite a stored `0` into NIL and break the idempotency of
     * `hasAppUlnConfig` (an omitted user field would never match a never-set chain value).
     *
     * @param {Uln302UlnConfig} config
     * @returns {SerializedUln302UlnConfig}
     */
    protected normalizeUlnConfig({
        confirmations,
        requiredDVNs,
        requiredDVNCount,
        optionalDVNs,
        optionalDVNCount,
        optionalDVNThreshold,
    }: Uln302UlnConfig): SerializedUln302UlnConfig {
        return {
            confirmations,
            optionalDVNThreshold,
            requiredDVNs: requiredDVNs.map(addChecksum).sort(compareBytes32Ascending),
            optionalDVNs: optionalDVNs.map(addChecksum).sort(compareBytes32Ascending),
            requiredDVNCount,
            optionalDVNCount,
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
