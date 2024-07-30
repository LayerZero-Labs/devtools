import { MessagingFee } from '@layerzerolabs/protocol-devtools'
import type {
    IEndpointV2,
    IUln302,
    SetConfigParam,
    Uln302ExecutorConfig,
    Uln302SetUlnConfig,
    Uln302UlnConfig,
    Uln302UlnUserConfig,
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
import { canAddInstruction, OmniSDK } from '@layerzerolabs/devtools-solana'
import { Timeout } from '@layerzerolabs/protocol-devtools'
import { Uln302SetExecutorConfig } from '@layerzerolabs/protocol-devtools'
import { Logger, printJson } from '@layerzerolabs/io-devtools'
import { EndpointPDADeriver, EndpointProgram, SetConfigType } from '@layerzerolabs/lz-solana-sdk-v2'
import { Connection, PublicKey, Transaction } from '@solana/web3.js'
import assert from 'assert'
import { Uln302 } from '@/uln302'
import { SetConfigSchema } from './schema'

/**
 * Solana-specific SDK for EndpointV2 contracts
 *
 * @implements {IEndpointV2}
 */
export class EndpointV2 extends OmniSDK implements IEndpointV2 {
    public readonly program: EndpointProgram.Endpoint

    public readonly deriver: EndpointPDADeriver

    constructor(connection: Connection, point: OmniPoint, userAccount: PublicKey, logger?: Logger) {
        super(connection, point, userAccount, logger)

        this.program = new EndpointProgram.Endpoint(this.publicKey)
        this.deriver = new EndpointPDADeriver(this.publicKey)
    }

    @AsyncRetriable()
    async getDelegate(oapp: OmniAddress): Promise<OmniAddress | undefined> {
        this.logger.debug(`Getting delegate for ${oapp}`)

        try {
            const [oAppRegistry] = this.deriver.oappRegistry(new PublicKey(oapp))
            const oAppRegistryInfo = await EndpointProgram.accounts.OAppRegistry.fromAccountAddress(
                this.connection,
                oAppRegistry
            )

            return oAppRegistryInfo.delegate.toBase58()
        } catch (error) {
            throw new Error(`Failed to get delegate for ${this.label} for oapp ${oapp}: ${error}`)
        }
    }

    async isDelegate(oapp: OmniAddress, delegate: OmniAddress): Promise<boolean> {
        this.logger.debug(`Checking whether ${delegate} is a delegate for OApp ${oapp}`)

        return areBytes32Equal(
            normalizePeer(delegate, this.point.eid),
            normalizePeer(await this.getDelegate(oapp), this.point.eid)
        )
    }

    async getUln302SDK(address: OmniAddress): Promise<IUln302> {
        this.logger.debug(`Getting Uln302 SDK for address ${address}`)

        return new Uln302(this.connection, { eid: this.point.eid, address }, this.userAccount)
    }

    @AsyncRetriable()
    async getDefaultReceiveLibrary(eid: EndpointId): Promise<OmniAddress | undefined> {
        const eidLabel = formatEid(eid)

        this.logger.debug(`Getting default receive library for eid ${eid} (${eidLabel})`)

        const config = await mapError(
            () => this.program.getDefaultReceiveLibrary(this.connection, eid),
            (error) =>
                new Error(`Failed to get the default receive library for ${this.label} for ${eidLabel}: ${error}`)
        )

        const lib = config?.owner?.toBase58() ?? undefined
        this.logger.debug(`Got default receive library for eid ${eid} (${eidLabel}): ${lib}`)

        return lib
    }

    @AsyncRetriable()
    async getSendLibrary(sender: OmniAddress, dstEid: EndpointId): Promise<OmniAddress | undefined> {
        const eidLabel = formatEid(dstEid)

        this.logger.debug(`Getting send library for eid ${dstEid} (${eidLabel}) and address ${sender}`)

        const config = await mapError(
            () => this.program.getSendLibrary(this.connection, new PublicKey(sender), dstEid),
            (error) =>
                new Error(
                    `Failed to get the send library for ${this.label} for OApp ${sender} for ${eidLabel}: ${error}`
                )
        )

        return config?.programId?.toBase58() ?? undefined
    }

    @AsyncRetriable()
    async getReceiveLibrary(
        receiver: OmniAddress,
        srcEid: EndpointId
    ): Promise<[address: OmniAddress | undefined, isDefault: boolean]> {
        const eidLabel = formatEid(srcEid)

        this.logger.debug(`Getting receive library for eid ${srcEid} (${eidLabel}) and address ${receiver}`)

        const config = await mapError(
            () => this.program.getReceiveLibrary(this.connection, new PublicKey(receiver), srcEid),
            (error) =>
                new Error(
                    `Failed to get the receive library for ${this.label} for OApp ${receiver} for ${eidLabel}: ${error}`
                )
        )

        const lib = config?.programId?.toBase58() ?? undefined
        const isDefault = config?.isDefault ?? false
        this.logger.debug(
            `Got receive library for eid ${srcEid} (${eidLabel}) and address ${receiver}: ${lib} (${isDefault ? 'default' : 'not default'})`
        )

        return [lib, isDefault]
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
        const eidLabel = formatEid(eid)

        this.logger.debug(`Getting default send library for eid ${eid} (${eidLabel})`)

        const config = await mapError(
            () => this.program.getDefaultSendLibrary(this.connection, eid),
            (error) => new Error(`Failed to get the default send library for ${this.label} for ${eidLabel}: ${error}`)
        )

        const lib = config?.owner?.toBase58() ?? undefined
        this.logger.debug(`Got default receive library for eid ${eid} (${eidLabel}): ${lib}`)

        return lib
    }

    @AsyncRetriable()
    async isDefaultSendLibrary(sender: OmniAddress, dstEid: EndpointId): Promise<boolean> {
        const eidLabel = formatEid(dstEid)

        this.logger.debug(`Checking default send library for eid ${dstEid} (${eidLabel}) and address ${sender}`)

        const config = await mapError(
            () => this.program.getSendLibrary(this.connection, new PublicKey(sender), dstEid),
            (error) =>
                new Error(
                    `Failed to check the default send library for ${this.label} for ${sender} for ${eidLabel}: ${error}`
                )
        )

        const isDefault = config?.isDefault ?? false
        this.logger.debug(
            `Checked default send library for eid ${dstEid} (${eidLabel}) and address ${sender}: ${isDefault}`
        )

        return isDefault
    }

    async setDefaultSendLibrary(eid: EndpointId, uln: OmniAddress | null | undefined): Promise<OmniTransaction> {
        this.logger.debug(`Setting default send library for eid ${eid} (${formatEid(eid)}) and ULN ${uln}`)

        throw new TypeError(`setDefaultSendLibrary() not implemented on Solana Endpoint SDK`)
    }

    async setSendLibrary(
        oapp: OmniAddress,
        eid: EndpointId,
        ulnMaybe: OmniAddress | null | undefined
    ): Promise<OmniTransaction> {
        const eidLabel = formatEid(eid)
        this.logger.debug(`Setting send library for eid ${eid} (${eidLabel}) and OApp ${oapp}`)

        // If no library has been provided, we go and fetch the default one
        const uln = ulnMaybe ?? (await this.getDefaultSendLibrary(eid))
        assert(uln != null, `No send library specified and default does not exist for setSendLibrary on ${this.label}`)

        this.logger.debug(`Setting send library for eid ${eid} (${eidLabel}) and OApp ${oapp} to ${uln}`)

        const instruction = await mapError(
            () => this.program.setSendLibrary(this.userAccount, new PublicKey(oapp), new PublicKey(uln), eid),
            (error) =>
                new Error(`Failed to set the send library for ${this.label} and OApp ${oapp} for ${eidLabel}: ${error}`)
        )

        const transaction = new Transaction().add(instruction)

        return {
            ...(await this.createTransaction(transaction)),
            description: `Setting send library for eid ${eid} (${eidLabel}) and OApp ${oapp} to ${uln}`,
        }
    }

    async setReceiveLibrary(
        oapp: OmniAddress,
        eid: EndpointId,
        ulnMaybe: OmniAddress | null | undefined,
        gracePeriod: bigint
    ): Promise<OmniTransaction> {
        const eidLabel = formatEid(eid)
        this.logger.debug(`Setting receive library for eid ${eid} (${eidLabel}) and OApp ${oapp}`)

        // If no library has been provided, we go and fetch the default one
        const uln = ulnMaybe ?? (await this.getDefaultReceiveLibrary(eid))
        assert(
            uln != null,
            `No receive library specified and default does not exist for setReceiveLibrary on ${this.label}`
        )

        this.logger.debug(`Setting receive library for eid ${eid} (${eidLabel}) and OApp ${oapp} to ${uln}`)

        const instruction = await mapError(
            () =>
                this.program.setReceiveLibrary(
                    this.userAccount,
                    new PublicKey(oapp),
                    new PublicKey(uln),
                    eid,
                    Number(gracePeriod)
                ),
            (error) =>
                new Error(
                    `Failed to set the receive library for ${this.label} and OApp ${oapp} for ${eidLabel}: ${error}`
                )
        )

        const transaction = new Transaction().add(instruction)

        return {
            ...(await this.createTransaction(transaction)),
            description: `Setting receive library for eid ${eid} (${eidLabel}) and OApp ${oapp} to ${uln}`,
        }
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

    async setConfig(
        oapp: OmniAddress,
        uln: OmniAddress,
        setConfigParams: SetConfigParam[]
    ): Promise<OmniTransaction[]> {
        this.logger.debug(`Setting config for OApp ${oapp} to ULN ${uln} with config ${printJson(setConfigParams)}`)

        // We'll use this to hold the transaction that receives any new instructions
        //
        // If the size of this transaction is about to overflow, we serialize it
        // and reset this variable to a new transaction
        let transaction = new Transaction()

        // For logging purposes we'll keep track of the set config params that we pushed into the current transaction
        let setConfigParamsInTransaction: SetConfigParam[] = []

        const omniTransactions: OmniTransaction[] = []

        for (const setConfigParam of setConfigParams) {
            try {
                // We run the config through a schema to ensure the formatting is good
                // and so that we convert the string DVN/executor addresses to public keys
                const parsedConfig = SetConfigSchema.parse(setConfigParam)

                const instruction = await this.program.setOappConfig(
                    this.connection,
                    this.userAccount,
                    new PublicKey(oapp),
                    new PublicKey(uln),
                    setConfigParam.eid,
                    {
                        configType: parsedConfig.configType,
                        value: parsedConfig.config,
                    }
                )

                // We now need to check whether we can add any new instructions to the current transaction
                if (canAddInstruction(transaction, instruction)) {
                    // If we can then we will
                    transaction.add(instruction)
                    setConfigParamsInTransaction.push(setConfigParam)
                } else {
                    // If we can't, we serialize the transaction as it is
                    omniTransactions.push({
                        ...(await this.createTransaction(transaction)),
                        description: `Setting config for ULN ${uln} to ${printJson(setConfigParamsInTransaction)}`,
                    })

                    // And we'll push the instruction to a new transaction
                    transaction = new Transaction().add(instruction)
                    setConfigParamsInTransaction = [setConfigParam]
                }
            } catch (error) {
                throw new Error(`Failed to setConfig for ${this.label} and OApp ${oapp} and ULN ${uln}: ${error}`)
            }
        }

        // If we have any leftover instructions to send, we'll add them to the resulting array
        if (transaction.instructions.length > 0) {
            omniTransactions.push({
                ...(await this.createTransaction(transaction)),
                description: `Setting config for ULN ${uln} to ${printJson(setConfigParamsInTransaction)}`,
            })
        }

        return omniTransactions
    }

    async setUlnConfig(
        oapp: OmniAddress,
        uln: OmniAddress,
        setUlnConfig: Uln302SetUlnConfig[]
    ): Promise<OmniTransaction[]> {
        this.logger.debug(`Setting ULN config for OApp ${oapp} to ULN ${uln} with config ${printJson(setUlnConfig)}`)

        throw new TypeError(`setConfig() not implemented on Solana Endpoint SDK`)
    }

    async setExecutorConfig(
        oapp: OmniAddress,
        uln: OmniAddress,
        setExecutorConfig: Uln302SetExecutorConfig[]
    ): Promise<OmniTransaction[]> {
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

        const ulnSdk = await this.getUln302SDK(uln)
        return await ulnSdk.getAppExecutorConfig(eid, oapp)
    }

    /**
     * @see {@link IEndpointV2.hasAppExecutorConfig}
     */
    async hasAppExecutorConfig(
        oapp: OmniAddress,
        uln: OmniAddress,
        eid: EndpointId,
        config: Uln302ExecutorConfig
    ): Promise<boolean> {
        this.logger.debug(
            `Checking executor app config for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} and ULN ${uln}`
        )

        const ulnSdk = await this.getUln302SDK(uln)
        return await ulnSdk.hasAppExecutorConfig(eid, oapp, config)
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

        const ulnSdk = await this.getUln302SDK(uln)
        return await ulnSdk.getAppUlnConfig(eid, oapp)
    }

    /**
     * @see {@link IEndpointV2.hasAppUlnConfig}
     */
    async hasAppUlnConfig(
        oapp: OmniAddress,
        uln: OmniAddress,
        eid: EndpointId,
        config: Uln302UlnUserConfig
    ): Promise<boolean> {
        this.logger.debug(`Checking ULN app config for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} and ULN ${uln}`)

        const ulnSdk = await this.getUln302SDK(uln)
        return ulnSdk.hasAppUlnConfig(eid, oapp, config)
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

    async getUlnConfigParams(uln: OmniAddress, setUlnConfig: Uln302SetUlnConfig[]): Promise<SetConfigParam[]> {
        const ulnSdk = (await this.getUln302SDK(uln)) as Uln302

        return setUlnConfig.map(({ eid, ulnConfig, type }) => ({
            eid,
            configType: type === 'send' ? SetConfigType.SEND_ULN : SetConfigType.RECEIVE_ULN,
            config: ulnSdk.encodeUlnConfig(ulnConfig),
        }))
    }

    async getExecutorConfigParams(
        uln: OmniAddress,
        setExecutorConfig: Uln302SetExecutorConfig[]
    ): Promise<SetConfigParam[]> {
        const ulnSdk = (await this.getUln302SDK(uln)) as Uln302

        return setExecutorConfig.map(({ eid, executorConfig }) => ({
            eid,
            configType: SetConfigType.EXECUTOR,
            config: ulnSdk.encodeExecutorConfig(executorConfig),
        }))
    }
}
