import { MessagingFee } from '@layerzerolabs/protocol-devtools'
import type {
    IEndpointV2,
    IUln302,
    SetConfigParam,
    Uln302ExecutorConfig,
    Uln302SetUlnConfig,
    Uln302UlnConfig,
} from '@layerzerolabs/protocol-devtools'
import {
    formatEid,
    type OmniAddress,
    type OmniTransaction,
    AsyncRetriable,
    OmniPoint,
    mapError,
    areBytes32Equal,
    normalizePeer,
} from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import { OmniSDK } from '@layerzerolabs/devtools-solana'
import { Timeout } from '@layerzerolabs/protocol-devtools'
import { Uln302SetExecutorConfig } from '@layerzerolabs/protocol-devtools'
import { Logger, printJson } from '@layerzerolabs/io-devtools'
import { EndpointProgram } from '@layerzerolabs/lz-solana-sdk-v2'
import { Connection, PublicKey } from '@solana/web3.js'

/**
 * EVM-specific SDK for EndpointV2 contracts
 *
 * @implements {IEndpointV2}
 */
export class EndpointV2 extends OmniSDK implements IEndpointV2 {
    public readonly program: EndpointProgram.Endpoint

    constructor(connection: Connection, point: OmniPoint, userAccount: PublicKey, logger?: Logger) {
        super(connection, point, userAccount, logger)

        this.program = new EndpointProgram.Endpoint(this.publicKey)
    }

    @AsyncRetriable()
    async getDelegate(oapp: OmniAddress): Promise<OmniAddress | undefined> {
        this.logger.debug(`Getting delegate for ${oapp}`)

        throw new TypeError(`getDelegate() not implemented on Solana Endpoint SDK`)
    }

    async isDelegate(oapp: OmniAddress, delegate: OmniAddress): Promise<boolean> {
        this.logger.debug(`Checking whether ${delegate} is a delegate for OApp ${oapp}`)

        throw new TypeError(`isDelegate() not implemented on Solana Endpoint SDK`)
    }

    async getUln302SDK(address: OmniAddress): Promise<IUln302> {
        this.logger.debug(`Getting Uln302 SDK for address ${address}`)

        throw new TypeError(`getUln302SDK() not implemented on Solana Endpoint SDK`)
    }

    @AsyncRetriable()
    async getDefaultReceiveLibrary(eid: EndpointId): Promise<OmniAddress | undefined> {
        this.logger.debug(`Getting default receive library for eid ${eid} (${formatEid(eid)})`)

        throw new TypeError(`getDefaultReceiveLibrary() not implemented on Solana Endpoint SDK`)
    }

    @AsyncRetriable()
    async getSendLibrary(sender: OmniAddress, dstEid: EndpointId): Promise<OmniAddress | undefined> {
        this.logger.debug(`Getting send library for eid ${dstEid} (${formatEid(dstEid)}) and address ${sender}`)

        throw new TypeError(`getSendLibrary() not implemented on Solana Endpoint SDK`)
    }

    @AsyncRetriable()
    async getReceiveLibrary(
        receiver: OmniAddress,
        srcEid: EndpointId
    ): Promise<[address: OmniAddress | undefined, isDefault: boolean]> {
        this.logger.debug(`Getting receive library for eid ${srcEid} (${formatEid(srcEid)}) and address ${receiver}`)

        throw new TypeError(`getReceiveLibrary() not implemented on Solana Endpoint SDK`)
    }

    async setDefaultReceiveLibrary(
        eid: EndpointId,
        uln: OmniAddress | null | undefined,
        gracePeriod: bigint = BigInt(0)
    ): Promise<OmniTransaction> {
        this.logger.debug(
            `Setting default receive library for eid ${eid} (${formatEid(eid)}) and ULN ${uln} with grace period of ${gracePeriod}`
        )

        throw new TypeError(`setDefaultReceiveLibrary() not implemented on Solana Endpoint SDK`)
    }

    @AsyncRetriable()
    async getDefaultSendLibrary(eid: EndpointId): Promise<OmniAddress | undefined> {
        this.logger.debug(`Getting default send library for eid ${eid} (${formatEid(eid)})`)

        const config = await mapError(
            () => this.program.getDefaultSendLibrary(this.connection, eid),
            (error) =>
                new Error(`Failed to get the default send library for ${this.label} for ${formatEid(eid)}: ${error}`)
        )

        return config?.msgLib.toBase58() ?? undefined
    }

    @AsyncRetriable()
    async isDefaultSendLibrary(sender: OmniAddress, dstEid: EndpointId): Promise<boolean> {
        this.logger.debug(
            `Checking default send library for eid ${dstEid} (${formatEid(dstEid)}) and address ${sender}`
        )

        return areBytes32Equal(
            normalizePeer(sender, this.point.eid),
            normalizePeer(await this.getDefaultSendLibrary(dstEid), this.point.eid)
        )
    }

    async setDefaultSendLibrary(eid: EndpointId, uln: OmniAddress | null | undefined): Promise<OmniTransaction> {
        this.logger.debug(`Setting default send library for eid ${eid} (${formatEid(eid)}) and ULN ${uln}`)

        throw new TypeError(`setDefaultSendLibrary() not implemented on Solana Endpoint SDK`)
    }

    async setSendLibrary(
        oapp: OmniAddress,
        eid: EndpointId,
        uln: OmniAddress | null | undefined
    ): Promise<OmniTransaction> {
        this.logger.debug(`Setting send library for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} to ULN ${uln}`)

        throw new TypeError(`setSendLibrary() not implemented on Solana Endpoint SDK`)
    }

    async setReceiveLibrary(
        oapp: OmniAddress,
        eid: EndpointId,
        uln: OmniAddress | null | undefined,
        gracePeriod: bigint
    ): Promise<OmniTransaction> {
        this.logger.debug(
            `Setting send library for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} to ULN ${uln} with a grace period of ${gracePeriod}`
        )

        throw new TypeError(`setReceiveLibrary() not implemented on Solana Endpoint SDK`)
    }

    @AsyncRetriable()
    async getReceiveLibraryTimeout(receiver: OmniAddress, srcEid: EndpointId): Promise<Timeout> {
        this.logger.debug(
            `Getting receive library timeout for eid ${srcEid} (${formatEid(srcEid)}) and address ${receiver}`
        )

        throw new TypeError(`getReceiveLibraryTimeout() not implemented on Solana Endpoint SDK`)
    }

    @AsyncRetriable()
    async getDefaultReceiveLibraryTimeout(eid: EndpointId): Promise<Timeout> {
        this.logger.debug(`Getting default receive library timeout for eid ${eid} (${formatEid(eid)})`)

        throw new TypeError(`getDefaultReceiveLibraryTimeout() not implemented on Solana Endpoint SDK`)
    }

    async setReceiveLibraryTimeout(
        oapp: OmniAddress,
        eid: EndpointId,
        uln: OmniAddress | null | undefined,
        expiry: bigint
    ): Promise<OmniTransaction> {
        this.logger.debug(
            `Setting receive library timeout for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} to ULN ${uln} with expiration period ${expiry}`
        )

        throw new TypeError(`setReceiveLibraryTimeout() not implemented on Solana Endpoint SDK`)
    }

    async setConfig(oapp: OmniAddress, uln: OmniAddress, setConfigParam: SetConfigParam[]): Promise<OmniTransaction> {
        this.logger.debug(`Setting config for OApp ${oapp} to ULN ${uln} with config ${printJson(setConfigParam)}`)

        throw new TypeError(`setConfig() not implemented on Solana Endpoint SDK`)
    }

    async setUlnConfig(
        oapp: OmniAddress,
        uln: OmniAddress,
        setUlnConfig: Uln302SetUlnConfig[]
    ): Promise<OmniTransaction> {
        this.logger.debug(`Setting ULN config for OApp ${oapp} to ULN ${uln} with config ${printJson(setUlnConfig)}`)

        throw new TypeError(`setConfig() not implemented on Solana Endpoint SDK`)
    }

    async setExecutorConfig(
        oapp: OmniAddress,
        uln: OmniAddress,
        setExecutorConfig: Uln302SetExecutorConfig[]
    ): Promise<OmniTransaction> {
        this.logger.debug(
            `Setting executor config for OApp ${oapp} to ULN ${uln} with config ${printJson(setExecutorConfig)}`
        )

        throw new TypeError(`setExecutorConfig() not implemented on Solana Endpoint SDK`)
    }

    async getExecutorConfig(oapp: OmniAddress, uln: OmniAddress, eid: EndpointId): Promise<Uln302ExecutorConfig> {
        this.logger.debug(`Getting executor config for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} and ULN ${uln}`)

        throw new TypeError(`getExecutorConfig() not implemented on Solana Endpoint SDK`)
    }

    async getAppExecutorConfig(oapp: OmniAddress, uln: OmniAddress, eid: EndpointId): Promise<Uln302ExecutorConfig> {
        this.logger.debug(
            `Getting executor app config for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} and ULN ${uln}`
        )

        throw new TypeError(`getAppExecutorConfig() not implemented on Solana Endpoint SDK`)
    }

    /**
     * @see {@link IEndpointV2.hasAppExecutorConfig}
     */
    async hasAppExecutorConfig(): Promise<boolean> {
        throw new TypeError(`hasAppExecutorConfig() not implemented on Solana Endpoint SDK`)
    }

    /**
     * @see {@link IUln302.getUlnConfig}
     */
    async getUlnConfig(oapp: OmniAddress, uln: OmniAddress, eid: EndpointId): Promise<Uln302UlnConfig> {
        this.logger.debug(`Getting ULN config for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} and ULN ${uln}`)

        throw new TypeError(`getUlnConfig() not implemented on Solana Endpoint SDK`)
    }

    /**
     * @see {@link IUln302.getAppUlnConfig}
     */
    async getAppUlnConfig(oapp: OmniAddress, uln: OmniAddress, eid: EndpointId): Promise<Uln302UlnConfig> {
        this.logger.debug(`Getting App ULN config for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} and ULN ${uln}`)

        throw new TypeError(`getAppUlnConfig() not implemented on Solana Endpoint SDK`)
    }

    /**
     * @see {@link IEndpointV2.hasAppUlnConfig}
     */
    async hasAppUlnConfig(): Promise<boolean> {
        throw new TypeError(`hasAppUlnConfig() not implemented on Solana Endpoint SDK`)
    }

    @AsyncRetriable()
    isRegisteredLibrary(): Promise<boolean> {
        throw new TypeError(`isRegisteredLibrary() not implemented on Solana Endpoint SDK`)
    }

    async registerLibrary(): Promise<OmniTransaction> {
        throw new TypeError(`registerLibrary() not implemented on Solana Endpoint SDK`)
    }

    @AsyncRetriable()
    public async quote(): Promise<MessagingFee> {
        throw new TypeError(`quote() not implemented on Solana Endpoint SDK`)
    }

    async getUlnConfigParams(): Promise<SetConfigParam[]> {
        throw new TypeError(`getUlnConfigParams() not implemented on Solana Endpoint SDK`)
    }

    async getExecutorConfigParams(): Promise<SetConfigParam[]> {
        throw new TypeError(`getExecutorConfigParams() not implemented on Solana Endpoint SDK`)
    }
}
