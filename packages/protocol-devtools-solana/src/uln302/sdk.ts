import type { EndpointId } from '@layerzerolabs/lz-definitions'
import {
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
    mapError,
} from '@layerzerolabs/devtools'
import { Logger, printBoolean, printJson } from '@layerzerolabs/io-devtools'
import { AsyncRetriable } from '@layerzerolabs/devtools'
import { OmniSDK } from '@layerzerolabs/devtools-solana'
import { UlnProgram } from '@layerzerolabs/lz-solana-sdk-v2'
import { Connection, PublicKey } from '@solana/web3.js'
import assert from 'assert'
import { Uln302UlnConfigInputSchema } from './schema'

export class Uln302 extends OmniSDK implements IUln302 {
    public readonly program: UlnProgram.Uln

    constructor(connection: Connection, point: OmniPoint, userAccount: PublicKey, logger?: Logger) {
        super(connection, point, userAccount, logger)

        this.program = new UlnProgram.Uln(UlnProgram.PROGRAM_ID)
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
        this.logger.debug(`Getting ULN ${type} config for eid ${eid} (${formatEid(eid)}) and address ${address}`)

        throw new TypeError(`getUlnConfig() not implemented on Solana Endpoint SDK`)
    }

    /**
     * @see {@link IUln302.getAppUlnConfig}
     */
    @AsyncRetriable()
    async getAppUlnConfig(eid: EndpointId, address: OmniAddress, type: Uln302ConfigType): Promise<Uln302UlnConfig> {
        const eidLabel = formatEid(eid)

        this.logger.debug(`Getting App ULN ${type} config for eid ${eid} (${eidLabel}) and address ${address}`)

        const config = await mapError(
            async (): Promise<UlnProgram.UlnConfig> => {
                const publicKey = new PublicKey(address)
                const config =
                    type === Uln302ConfigType.Receive
                        ? await this.program.getReceiveConfigState(this.connection, publicKey, eid)
                        : await this.program.getSendConfigState(this.connection, publicKey, eid)

                return (
                    config?.uln ?? {
                        confirmations: 0,
                        optionalDvnThreshold: 0,
                        requiredDvns: [],
                        optionalDvns: [],
                        requiredDvnCount: 0,
                        optionalDvnCount: 0,
                    }
                )
            },
            (error) =>
                new Error(
                    `Failed to get App ULN ${type} config for ${this.label} for OApp ${address} and ${eidLabel}: ${error}`
                )
        )

        assert(
            config != null,
            `Could not get App ULN ${type} config for ${this.label} and OApp ${address} and ${eidLabel}: Neither OApp nor default configs have been specified`
        )

        return Uln302UlnConfigInputSchema.parse(config)
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
            `Checking whether App ULN ${type} configs for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} match`
        )

        const currentConfig = await this.getAppUlnConfig(eid, oapp, type)
        const currentSerializedConfig = this.serializeUlnConfig(currentConfig)
        const serializedConfig = this.serializeUlnConfig(config)

        this.logger.debug(`Current App ULN ${type} config: ${printJson(currentSerializedConfig)}`)
        this.logger.debug(`Incoming App ULN ${type} config: ${printJson(serializedConfig)}`)

        // On Solana, a confirmation value of 0 in the configuration indicates that the config has been initialized but not explicitly set.
        // This is different from EVM where a 0 value might act as a default placeholder.
        //
        // If a user explicitly sets the confirmations to 0, it indicates they want to use the default configuration.
        // Therefore, we need to handle this case specially:
        //
        // - If the current chain config returns 0 for confirmations, it means the config is initialized but not explicitly set.
        // - If the incoming config has a 0 value for confirmations, this function will return false, allowing the user to set the default configuration.
        // - If the incoming config has a non-zero value for confirmations, the configs would not match anyway, so normal behavior applies.
        //
        // It's important to note that on Solana, a 0 value for confirmations doesn't mean turning off block confirmations; instead,
        // it's used as a signal to apply default settings. Unlike EVM, Solana requires explicitly setting this 0 value to activate the defaults.
        const hasZeroConfirmations = currentConfig.confirmations === BigInt(0)
        if (hasZeroConfirmations) {
            this.logger.verbose(
                `Received 0 value for confirmations for ULN ${type} config. This will be treated as a non-matching config`
            )
        }

        const areEqual = isDeepEqual(serializedConfig, currentSerializedConfig)
        const hasConfig = areEqual && !hasZeroConfirmations

        return this.logger.verbose(`Checked App ULN ${type} configs: ${printBoolean(hasConfig)}`), hasConfig
    }

    /**
     * @see {@link IUln302.getExecutorConfig}
     */
    @AsyncRetriable()
    async getExecutorConfig(): Promise<Uln302ExecutorConfig> {
        throw new TypeError(`getExecutorConfig() not implemented on Solana Endpoint SDK`)
    }

    /**
     * @see {@link IUln302.getAppExecutorConfig}
     */
    @AsyncRetriable()
    async getAppExecutorConfig(eid: EndpointId, address: OmniAddress): Promise<Uln302ExecutorConfig> {
        const eidLabel = formatEid(eid)

        this.logger.debug(`Getting executor config for eid ${eid} (${eidLabel}) and address ${address}`)

        const config = await mapError(
            async () => {
                const publicKey = new PublicKey(address)

                return (
                    (await this.program.getSendConfigState(this.connection, publicKey, eid)) ??
                    (this.logger.warn(
                        `Got an empty executor config for OApp ${address} and ${eidLabel}, getting the default one`
                    ),
                    await this.program.getDefaultSendConfigState(this.connection, eid))
                )
            },
            (error) =>
                new Error(
                    `Failed to get executor config for ${this.label} for OApp ${address} and ${eidLabel}: ${error}`
                )
        )

        assert(
            config != null,
            `Could not get OApp executor config for ${this.label} and OApp ${address} and ${eidLabel}: Neither app nor default configs have been specified`
        )

        return {
            maxMessageSize: config.executor.maxMessageSize,
            executor: config.executor.executor.toBase58(),
        }
    }

    /**
     * @see {@link IUln302.hasAppExecutorConfig}
     */
    async hasAppExecutorConfig(eid: EndpointId, oapp: OmniAddress, config: Uln302ExecutorConfig): Promise<boolean> {
        const currentConfig = await this.getAppExecutorConfig(eid, oapp)
        const currentSerializedConfig = this.serializeExecutorConfig(currentConfig)
        const serializedConfig = this.serializeExecutorConfig(config)

        this.logger.debug(`Checking whether Executor configs for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} match`)
        this.logger.debug(`Current config: ${printJson(currentSerializedConfig)}`)
        this.logger.debug(`Incoming config: ${printJson(serializedConfig)}`)

        return isDeepEqual(serializedConfig, currentSerializedConfig)
    }

    /**
     * @see {@link IUln302.setDefaultExecutorConfig}
     */
    async setDefaultExecutorConfig(_eid: EndpointId, _config: Uln302ExecutorConfig): Promise<OmniTransaction> {
        throw new TypeError(`getExecutorConfig() not implemented on Solana Endpoint SDK`)
    }

    encodeExecutorConfig(config: Uln302ExecutorConfig): SerializedUln302ExecutorConfig {
        return this.serializeExecutorConfig(config)
    }

    encodeUlnConfig(config: Uln302UlnUserConfig): SerializedUln302UlnConfig {
        return this.serializeUlnConfig(config)
    }

    async setDefaultUlnConfig(_eid: EndpointId, _config: Uln302UlnUserConfig): Promise<OmniTransaction> {
        throw new TypeError(`getExecutorConfig() not implemented on Solana Endpoint SDK`)
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
            requiredDVNs: serializeDVNs(requiredDVNs),
            optionalDVNs: serializeDVNs(optionalDVNs),
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
            executor,
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

const serializeDVNs = (dvns: OmniAddress[]) =>
    dvns
        .map((address) => new PublicKey(address).toBytes())
        .sort(compareBytes32Ascending)
        .map((bytes) => new PublicKey(bytes).toBase58())
