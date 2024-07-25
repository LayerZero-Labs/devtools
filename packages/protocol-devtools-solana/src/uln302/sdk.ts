import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type {
    IUln302,
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
import { Logger, printJson } from '@layerzerolabs/io-devtools'
import { AsyncRetriable } from '@layerzerolabs/devtools'
import { OmniSDK } from '@layerzerolabs/devtools-solana'
import { UlnProgram } from '@layerzerolabs/lz-solana-sdk-v2'
import { Connection, PublicKey } from '@solana/web3.js'
import assert from 'assert'

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
    async getUlnConfig(eid: EndpointId, address?: OmniAddress | null | undefined): Promise<Uln302UlnConfig> {
        this.logger.debug(`Getting ULN config for eid ${eid} (${formatEid(eid)}) and address ${address}`)

        throw new TypeError(`getUlnConfig() not implemented on Solana Endpoint SDK`)
    }

    /**
     * @see {@link IUln302.getAppUlnConfig}
     */
    @AsyncRetriable()
    async getAppUlnConfig(eid: EndpointId, address: OmniAddress): Promise<Uln302UlnConfig> {
        const eidLabel = formatEid(eid)

        this.logger.debug(`Getting ULN config for eid ${eid} (${eidLabel}) and address ${address}`)

        const config = await mapError(
            async () => {
                const publicKey = new PublicKey(address)

                return (
                    (await this.program.getReceiveConfigState(this.connection, publicKey, eid)) ??
                    (this.logger.warn(
                        `Got an empty ULN config for OApp ${address} and ${eidLabel}, getting the default one`
                    ),
                    await this.program.getDefaultReceiveConfigState(this.connection, eid))
                )
            },
            (error) =>
                new Error(`Failed to get ULN config for ${this.label} for OApp ${address} and ${eidLabel}: ${error}`)
        )

        assert(
            config != null,
            `Could not get OApp ULN config for ${this.label} and OApp ${address} and ${eidLabel}: Neither app nor default configs have been specified`
        )

        return {
            confirmations: BigInt(
                typeof config.uln.confirmations === 'number'
                    ? config.uln.confirmations
                    : config.uln.confirmations.toString(10)
            ),
            optionalDVNThreshold: config.uln.optionalDvnThreshold,
            requiredDVNs: config.uln.requiredDvns.map((key) => key.toBase58()),
            optionalDVNs: config.uln.optionalDvns.map((key) => key.toBase58()),
        }
    }

    /**
     * @see {@link IUln302.hasAppUlnConfig}
     */
    async hasAppUlnConfig(eid: EndpointId, oapp: string, config: Uln302UlnUserConfig): Promise<boolean> {
        const currentConfig = await this.getAppUlnConfig(eid, oapp)
        const currentSerializedConfig = this.serializeUlnConfig(currentConfig)
        const serializedConfig = this.serializeUlnConfig(config)

        this.logger.debug(`Checking whether ULN configs for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} match`)
        this.logger.debug(`Current config: ${printJson(currentSerializedConfig)}`)
        this.logger.debug(`Incoming config: ${printJson(serializedConfig)}`)

        return isDeepEqual(serializedConfig, currentSerializedConfig)
    }

    /**
     * @see {@link IUln302.getExecutorConfig}
     */
    @AsyncRetriable()
    async getExecutorConfig(
        _eid: EndpointId,
        _address?: OmniAddress | null | undefined
    ): Promise<Uln302ExecutorConfig> {
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

    decodeExecutorConfig(_executorConfigBytes: string): Uln302ExecutorConfig {
        throw new TypeError(`getExecutorConfig() not implemented on Solana Endpoint SDK`)
    }

    encodeExecutorConfig(_config: Uln302ExecutorConfig): string {
        throw new TypeError(`getExecutorConfig() not implemented on Solana Endpoint SDK`)
    }

    decodeUlnConfig(_ulnConfigBytes: string): Uln302UlnConfig {
        throw new TypeError(`getExecutorConfig() not implemented on Solana Endpoint SDK`)
    }

    encodeUlnConfig(_config: Uln302UlnUserConfig): string {
        throw new TypeError(`getExecutorConfig() not implemented on Solana Endpoint SDK`)
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
