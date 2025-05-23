import { MessageParams, MessagingFee, TimeoutSchema } from '@layerzerolabs/protocol-devtools'
import assert from 'assert'
import type {
    IEndpointV2,
    SetConfigParam,
    Uln302ConfigType,
    Uln302ExecutorConfig,
    Uln302SetUlnConfig,
    Uln302UlnConfig,
    Uln302UlnUserConfig,
    UlnReadSetUlnConfig,
    UlnReadUlnConfig,
    UlnReadUlnUserConfig,
} from '@layerzerolabs/protocol-devtools'
import {
    formatEid,
    type OmniAddress,
    type OmniTransaction,
    formatOmniPoint,
    isZero,
    ignoreZero,
    areBytes32Equal,
    AsyncRetriable,
    OmniPoint,
} from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import { addChecksum, makeZeroAddress, OmniSDK, Provider } from '@layerzerolabs/devtools-evm'
import { Timeout } from '@layerzerolabs/protocol-devtools'
import { Uln302 } from '@/uln302'
import { Uln302SetExecutorConfig } from '@layerzerolabs/protocol-devtools'
import { printJson } from '@layerzerolabs/io-devtools'
import { ReceiveLibrarySchema } from './schema'
import { abi } from '@layerzerolabs/lz-evm-sdk-v2/artifacts/contracts/EndpointV2.sol/EndpointV2.json'
import { Contract } from '@ethersproject/contracts'
import { UlnRead } from '@/ulnRead'
import { BlockedUln302 } from '@/uln302/blockedSdk'

const CONFIG_TYPE_EXECUTOR = 1
const CONFIG_TYPE_ULN = 2
const CONFIG_TYPE_READ_LIB_CONFIG = 1

/**
 * EVM-specific SDK for EndpointV2 contracts
 *
 * @implements {IEndpointV2}
 */
export class EndpointV2 extends OmniSDK implements IEndpointV2 {
    constructor(provider: Provider, point: OmniPoint) {
        super({ eid: point.eid, contract: new Contract(point.address, abi).connect(provider) })
    }

    @AsyncRetriable()
    async getDelegate(oapp: OmniAddress): Promise<OmniAddress | undefined> {
        this.logger.debug(`Getting delegate for OApp ${oapp}`)

        return ignoreZero(await this.contract.contract.delegates(oapp))
    }

    async isDelegate(oapp: OmniAddress, delegate: OmniAddress): Promise<boolean> {
        this.logger.debug(`Checking whether ${delegate} is a delegate for OApp ${oapp}`)

        return areBytes32Equal(await this.getDelegate(oapp), delegate)
    }

    async getUln302SDK(address: OmniAddress): Promise<Uln302> {
        this.logger.debug(`Getting Uln302 SDK for address ${address}`)

        assert(
            !isZero(address),
            `Uln302 cannot be instantiated: Uln302 address cannot be a zero value for EndpointV2 ${formatOmniPoint(
                this.point
            )}`
        )

        if (await this.isBlockedLibrary(address)) {
            return new BlockedUln302(this.contract.contract.provider as Provider, { eid: this.point.eid, address })
        }

        return new Uln302(this.contract.contract.provider as Provider, { eid: this.point.eid, address })
    }

    async getUlnReadSDK(address: OmniAddress): Promise<UlnRead> {
        this.logger.debug(`Getting UlnRead SDK for address ${address}`)

        assert(
            !isZero(address),
            `UlnRead cannot be instantiated: UlnRead address cannot be a zero value for EndpointV2 ${formatOmniPoint(
                this.point
            )}`
        )

        return new UlnRead(this.contract.contract.provider as Provider, { eid: this.point.eid, address })
    }

    @AsyncRetriable()
    async getDefaultReceiveLibrary(eid: EndpointId): Promise<OmniAddress | undefined> {
        this.logger.debug(`Getting default receive library for eid ${eid} (${formatEid(eid)})`)

        return ignoreZero(await this.contract.contract.defaultReceiveLibrary(eid))
    }

    @AsyncRetriable()
    async getSendLibrary(sender: OmniAddress, dstEid: EndpointId): Promise<OmniAddress | undefined> {
        this.logger.debug(`Getting send library for eid ${dstEid} (${formatEid(dstEid)}) and address ${sender}`)

        try {
            return ignoreZero(await this.contract.contract.getSendLibrary(sender, dstEid))
        } catch (error) {
            // If a default receive library is not available, this call will throw
            // in which case we need to check whether a default library is available
            const parsedError = await this.parseError(error)
            if (parsedError.reason === 'LZ_DefaultSendLibUnavailable') {
                this.logger.warn(`Send library not set and default not available for eid ${formatEid(dstEid)}`)

                return undefined
            }

            throw error
        }
    }

    @AsyncRetriable()
    async getReceiveLibrary(
        receiver: OmniAddress,
        srcEid: EndpointId
    ): Promise<[address: OmniAddress | undefined, isDefault: boolean]> {
        this.logger.debug(`Getting receive library for eid ${srcEid} (${formatEid(srcEid)}) and address ${receiver}`)

        try {
            return ReceiveLibrarySchema.parse(await this.contract.contract.getReceiveLibrary(receiver, srcEid))
        } catch (error) {
            // If a default receive library is not available, this call will throw
            // in which case we need to check whether a default library is available
            const parsedError = await this.parseError(error)
            if (parsedError.reason === 'LZ_DefaultReceiveLibUnavailable') {
                this.logger.warn(`Receive library not set and default not available for eid ${formatEid(srcEid)}`)

                return [undefined, true]
            }

            throw error
        }
    }

    async setDefaultReceiveLibrary(
        eid: EndpointId,
        uln: OmniAddress | null | undefined,
        gracePeriod: bigint = BigInt(0)
    ): Promise<OmniTransaction> {
        this.logger.debug(
            `Setting default receive library for eid ${eid} (${formatEid(eid)}) and ULN ${uln} with grace period of ${gracePeriod}`
        )

        const data = this.contract.contract.interface.encodeFunctionData('setDefaultReceiveLibrary', [
            eid,
            makeZeroAddress(uln),
            gracePeriod,
        ])

        return {
            ...this.createTransaction(data),
            description: `Setting default receive library for ${formatEid(eid)} to ${makeZeroAddress(uln)}`,
        }
    }

    @AsyncRetriable()
    async getDefaultSendLibrary(eid: EndpointId): Promise<OmniAddress | undefined> {
        this.logger.debug(`Getting default send library for eid ${eid} (${formatEid(eid)})`)

        return ignoreZero(await this.contract.contract.defaultSendLibrary(eid))
    }

    @AsyncRetriable()
    async isDefaultSendLibrary(sender: OmniAddress, dstEid: EndpointId): Promise<boolean> {
        this.logger.debug(
            `Checking default send library for eid ${dstEid} (${formatEid(dstEid)}) and address ${sender}`
        )

        if (isZero(sender)) {
            this.logger.warn(`Checking default send library received a zero address (${sender}) for eid ${dstEid}`)
        }

        return await this.contract.contract.isDefaultSendLibrary(sender, dstEid)
    }

    async setDefaultSendLibrary(eid: EndpointId, uln: OmniAddress | null | undefined): Promise<OmniTransaction> {
        this.logger.debug(`Setting default send library for eid ${eid} (${formatEid(eid)}) and ULN ${uln}`)

        const data = this.contract.contract.interface.encodeFunctionData('setDefaultSendLibrary', [
            eid,
            makeZeroAddress(uln),
        ])

        return {
            ...this.createTransaction(data),
            description: `Setting default send library for ${formatEid(eid)} to ${uln}`,
        }
    }

    async setSendLibrary(
        oapp: OmniAddress,
        eid: EndpointId,
        uln: OmniAddress | null | undefined
    ): Promise<OmniTransaction> {
        this.logger.debug(`Setting send library for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} to ULN ${uln}`)

        const data = this.contract.contract.interface.encodeFunctionData('setSendLibrary', [oapp, eid, uln])

        return {
            ...this.createTransaction(data),
            description: `Setting send library for ${formatEid(eid)} to ${uln}`,
        }
    }

    async setReceiveLibrary(
        oapp: OmniAddress,
        eid: EndpointId,
        uln: OmniAddress | null | undefined,
        gracePeriod: bigint
    ): Promise<OmniTransaction> {
        this.logger.debug(
            `Setting receive library for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} to ULN ${uln} with a grace period of ${gracePeriod}`
        )

        const data = this.contract.contract.interface.encodeFunctionData('setReceiveLibrary', [
            oapp,
            eid,
            uln,
            gracePeriod,
        ])

        return {
            ...this.createTransaction(data),
            description: `Setting receive library for ${formatEid(eid)} to ${uln} with grace period ${gracePeriod}`,
        }
    }

    @AsyncRetriable()
    async getReceiveLibraryTimeout(receiver: OmniAddress, srcEid: EndpointId): Promise<Timeout> {
        this.logger.debug(
            `Getting receive library timeout for eid ${srcEid} (${formatEid(srcEid)}) and address ${receiver}`
        )

        const timeout = await this.contract.contract.receiveLibraryTimeout(receiver, srcEid)

        return TimeoutSchema.parse({ ...timeout })
    }

    @AsyncRetriable()
    async getDefaultReceiveLibraryTimeout(eid: EndpointId): Promise<Timeout> {
        this.logger.debug(`Getting default receive library timeout for eid ${eid} (${formatEid(eid)})`)

        const timeout = await this.contract.contract.defaultReceiveLibraryTimeout(eid)

        return TimeoutSchema.parse({ ...timeout })
    }

    async setReceiveLibraryTimeout(
        oapp: OmniAddress,
        eid: EndpointId,
        uln: OmniAddress | null | undefined,
        expiry: bigint
    ): Promise<OmniTransaction> {
        this.logger.debug(
            `Setting receive library timeout for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} to ULN ${makeZeroAddress(uln)} with expiration period ${expiry}`
        )

        const data = this.contract.contract.interface.encodeFunctionData('setReceiveLibraryTimeout', [
            oapp,
            eid,
            uln,
            expiry,
        ])

        return {
            ...this.createTransaction(data),
            description: `Setting receive library timeout for ${formatEid(
                eid
            )} to ${uln} with expiration period ${expiry}`,
        }
    }

    async setConfig(oapp: OmniAddress, uln: OmniAddress, setConfigParam: SetConfigParam[]): Promise<OmniTransaction[]> {
        this.logger.debug(`Setting config for OApp ${oapp} to ULN ${uln} with config ${printJson(setConfigParam)}`)

        const data = this.contract.contract.interface.encodeFunctionData('setConfig', [oapp, uln, setConfigParam])

        return [
            {
                ...this.createTransaction(data),
                description: `Setting config for ULN ${uln} to ${printJson(setConfigParam)}`,
            },
        ]
    }

    async setUlnConfig(
        oapp: OmniAddress,
        uln: OmniAddress,
        setUlnConfig: Uln302SetUlnConfig[]
    ): Promise<OmniTransaction[]> {
        this.logger.debug(`Setting ULN config for OApp ${oapp} to ULN ${uln} with config ${printJson(setUlnConfig)}`)

        const setUlnConfigParams: SetConfigParam[] = await this.getUlnConfigParams(uln, setUlnConfig)
        return await this.setConfig(oapp, uln, setUlnConfigParams)
    }

    async setUlnReadConfig(
        oapp: OmniAddress,
        uln: OmniAddress,
        setUlnConfig: UlnReadSetUlnConfig[]
    ): Promise<OmniTransaction[]> {
        this.logger.debug(`Setting ULN config for OApp ${oapp} to ULN ${uln} with config ${printJson(setUlnConfig)}`)

        const setUlnConfigParams: SetConfigParam[] = await this.getUlnReadConfigParams(uln, setUlnConfig)
        return await this.setConfig(oapp, uln, setUlnConfigParams)
    }

    async setExecutorConfig(
        oapp: OmniAddress,
        uln: OmniAddress,
        setExecutorConfig: Uln302SetExecutorConfig[]
    ): Promise<OmniTransaction[]> {
        this.logger.debug(
            `Setting executor config for OApp ${oapp} to ULN ${uln} with config ${printJson(setExecutorConfig)}`
        )

        const setExecutorConfigParams: SetConfigParam[] = await this.getExecutorConfigParams(uln, setExecutorConfig)
        return await this.setConfig(oapp, uln, setExecutorConfigParams)
    }

    async getExecutorConfig(oapp: OmniAddress, uln: OmniAddress, eid: EndpointId): Promise<Uln302ExecutorConfig> {
        this.logger.debug(`Getting executor config for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} and ULN ${uln}`)

        const ulnSdk = await this.getUln302SDK(uln)
        return await ulnSdk.getExecutorConfig(eid, oapp)
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
        const ulnSdk = await this.getUln302SDK(uln)

        return ulnSdk.hasAppExecutorConfig(eid, oapp, config)
    }

    /**
     * @see {@link IEndpointV2.getUlnConfig}
     */
    async getUlnConfig(
        oapp: OmniAddress,
        uln: OmniAddress,
        eid: EndpointId,
        type: Uln302ConfigType
    ): Promise<Uln302UlnConfig> {
        this.logger.debug(
            `Getting ULN ${type} config for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} and ULN ${uln}`
        )

        const ulnSdk = await this.getUln302SDK(uln)
        return await ulnSdk.getUlnConfig(eid, oapp, type)
    }

    /**
     * @see {@link IEndpointV2.getAppUlnConfig}
     */
    async getAppUlnConfig(
        oapp: OmniAddress,
        uln: OmniAddress,
        eid: EndpointId,
        type: Uln302ConfigType
    ): Promise<Uln302UlnConfig> {
        this.logger.debug(
            `Getting App ULN ${type} config for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} and ULN ${uln}`
        )

        const ulnSdk = await this.getUln302SDK(uln)
        return await ulnSdk.getAppUlnConfig(eid, oapp, type)
    }

    /**
     * @see {@link IEndpointV2.getAppUlnReadConfig}
     */
    async getAppUlnReadConfig(oapp: OmniAddress, uln: OmniAddress, channelId: number): Promise<UlnReadUlnConfig> {
        this.logger.debug(`Getting App ULN read config for eid ${channelId} and OApp ${oapp} and ULN ${uln}`)

        const ulnSdk = await this.getUlnReadSDK(uln)
        return await ulnSdk.getAppUlnConfig(channelId, oapp)
    }

    /**
     * @see {@link IEndpointV2.hasAppUlnConfig}
     */
    async hasAppUlnConfig(
        oapp: string,
        uln: OmniAddress,
        eid: EndpointId,
        config: Uln302UlnUserConfig,
        type: Uln302ConfigType
    ): Promise<boolean> {
        const ulnSdk = await this.getUln302SDK(uln)

        return ulnSdk.hasAppUlnConfig(eid, oapp, config, type)
    }

    /**
     * @see {@link IEndpointV2.hasAppUlnReadConfig}
     */
    async hasAppUlnReadConfig(
        oapp: string,
        uln: OmniAddress,
        channelId: number,
        config: UlnReadUlnUserConfig
    ): Promise<boolean> {
        const ulnSdk = await this.getUlnReadSDK(uln)

        return ulnSdk.hasAppUlnConfig(channelId, oapp, config)
    }

    @AsyncRetriable()
    isRegisteredLibrary(uln: OmniAddress): Promise<boolean> {
        return this.contract.contract.isRegisteredLibrary(uln)
    }

    async isBlockedLibrary(uln: OmniAddress): Promise<boolean> {
        return (await this.contract.contract.blockedLibrary()) === addChecksum(uln)
    }

    async registerLibrary(uln: OmniAddress): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('registerLibrary', [uln])

        return {
            ...this.createTransaction(data),
            description: `Registering library ${uln}`,
        }
    }

    @AsyncRetriable()
    public async quote(params: MessageParams, sender: OmniAddress): Promise<MessagingFee> {
        const { nativeFee, lzTokenFee } = await this.contract.contract.quote(params, sender)
        return {
            nativeFee: BigInt(nativeFee),
            lzTokenFee: BigInt(lzTokenFee),
        }
    }

    async getUlnConfigParams(uln: OmniAddress, setUlnConfig: Uln302SetUlnConfig[]): Promise<SetConfigParam[]> {
        const ulnSdk = await this.getUln302SDK(uln)

        return setUlnConfig.map(({ eid, ulnConfig }) => ({
            eid,
            configType: CONFIG_TYPE_ULN,
            config: ulnSdk.encodeUlnConfig(ulnConfig),
        }))
    }

    async getUlnReadConfigParams(uln: OmniAddress, setUlnConfig: UlnReadSetUlnConfig[]): Promise<SetConfigParam[]> {
        const ulnSdk = await this.getUlnReadSDK(uln)

        return setUlnConfig.map(({ channelId, ulnConfig }) => ({
            eid: channelId,
            configType: CONFIG_TYPE_READ_LIB_CONFIG,
            config: ulnSdk.encodeUlnConfig(ulnConfig),
        }))
    }

    async getExecutorConfigParams(
        uln: OmniAddress,
        setExecutorConfig: Uln302SetExecutorConfig[]
    ): Promise<SetConfigParam[]> {
        const ulnSdk = await this.getUln302SDK(uln)

        return setExecutorConfig.map(({ eid, executorConfig }) => ({
            eid,
            configType: CONFIG_TYPE_EXECUTOR,
            config: ulnSdk.encodeExecutorConfig(executorConfig),
        }))
    }
}
