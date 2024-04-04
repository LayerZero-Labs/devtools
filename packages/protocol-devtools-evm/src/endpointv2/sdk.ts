import { MessageParams, MessagingFee, TimeoutSchema } from '@layerzerolabs/protocol-devtools'
import assert from 'assert'
import type {
    IEndpointV2,
    IUln302,
    SetConfigParam,
    Uln302ExecutorConfig,
    Uln302Factory,
    Uln302SetUlnConfig,
    Uln302UlnConfig,
    Uln302UlnUserConfig,
} from '@layerzerolabs/protocol-devtools'
import {
    formatEid,
    type OmniAddress,
    type OmniTransaction,
    formatOmniPoint,
    isZero,
    ignoreZero,
    areBytes32Equal,
} from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import { makeZeroAddress, type OmniContract, OmniSDK } from '@layerzerolabs/devtools-evm'
import { Timeout } from '@layerzerolabs/protocol-devtools'
import { Uln302 } from '@/uln302'
import { Uln302SetExecutorConfig } from '@layerzerolabs/protocol-devtools'
import { printJson } from '@layerzerolabs/io-devtools'

const CONFIG_TYPE_EXECUTOR = 1
const CONFIG_TYPE_ULN = 2

/**
 * EVM-specific SDK for EndpointV2 contracts
 *
 * @implements {IEndpointV2}
 */
export class EndpointV2 extends OmniSDK implements IEndpointV2 {
    constructor(
        contract: OmniContract,
        private readonly uln302Factory: Uln302Factory
    ) {
        super(contract)
    }

    async getDelegate(oapp: OmniAddress): Promise<OmniAddress | undefined> {
        this.logger.debug(`Getting delegate for OApp ${oapp}`)

        return ignoreZero(await this.contract.contract.delegates(oapp))
    }

    async isDelegate(oapp: OmniAddress, delegate: OmniAddress): Promise<boolean> {
        this.logger.debug(`Checking whether ${delegate} is a delegate for OApp ${oapp}`)

        return areBytes32Equal(await this.getDelegate(oapp), delegate)
    }

    async getUln302SDK(address: OmniAddress): Promise<IUln302> {
        this.logger.debug(`Getting Uln302 SDK for address ${address}`)

        assert(
            !isZero(address),
            `Uln302 cannot be instantiated: Uln302 address cannot be a zero value for EndpointV2 ${formatOmniPoint(
                this.point
            )}`
        )

        return await this.uln302Factory({ eid: this.point.eid, address })
    }

    async getDefaultReceiveLibrary(eid: EndpointId): Promise<OmniAddress | undefined> {
        this.logger.debug(`Getting default receive library for eid ${eid} (${formatEid(eid)})`)

        return ignoreZero(await this.contract.contract.defaultReceiveLibrary(eid))
    }

    async getSendLibrary(sender: OmniAddress, dstEid: EndpointId): Promise<OmniAddress | undefined> {
        this.logger.debug(`Getting send library for eid ${dstEid} (${formatEid(dstEid)}) and address ${sender}`)

        return ignoreZero(await this.contract.contract.getSendLibrary(sender, dstEid))
    }

    async getReceiveLibrary(
        receiver: OmniAddress,
        srcEid: EndpointId
    ): Promise<[address: OmniAddress | undefined, isDefault: boolean]> {
        this.logger.debug(`Getting receive library for eid ${srcEid} (${formatEid(srcEid)}) and address ${receiver}`)

        return await this.contract.contract.getReceiveLibrary(receiver, srcEid)
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

    async getDefaultSendLibrary(eid: EndpointId): Promise<OmniAddress | undefined> {
        this.logger.debug(`Getting default send library for eid ${eid} (${formatEid(eid)})`)

        return ignoreZero(await this.contract.contract.defaultSendLibrary(eid))
    }

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
            `Setting send library for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} to ULN ${uln} with a grace period of ${gracePeriod}`
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

    async getReceiveLibraryTimeout(receiver: OmniAddress, srcEid: EndpointId): Promise<Timeout> {
        this.logger.debug(
            `Getting receive library timeout for eid ${srcEid} (${formatEid(srcEid)}) and address ${receiver}`
        )

        const timeout = await this.contract.contract.receiveLibraryTimeout(receiver, srcEid)

        return TimeoutSchema.parse({ ...timeout })
    }

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

    async setConfig(oapp: OmniAddress, uln: OmniAddress, setConfigParam: SetConfigParam[]): Promise<OmniTransaction> {
        this.logger.debug(`Setting config for OApp ${oapp} to ULN ${uln} with config ${printJson(setConfigParam)}`)

        const data = this.contract.contract.interface.encodeFunctionData('setConfig', [oapp, uln, setConfigParam])

        return {
            ...this.createTransaction(data),
            description: `Setting config for ULN ${uln} to ${printJson(setConfigParam)}`,
        }
    }

    async setUlnConfig(
        oapp: OmniAddress,
        uln: OmniAddress,
        setUlnConfig: Uln302SetUlnConfig[]
    ): Promise<OmniTransaction> {
        this.logger.debug(`Setting ULN config for OApp ${oapp} to ULN ${uln} with config ${printJson(setUlnConfig)}`)

        const setUlnConfigParams: SetConfigParam[] = await this.getUlnConfigParams(uln, setUlnConfig)
        return await this.setConfig(oapp, uln, setUlnConfigParams)
    }

    async setExecutorConfig(
        oapp: OmniAddress,
        uln: OmniAddress,
        setExecutorConfig: Uln302SetExecutorConfig[]
    ): Promise<OmniTransaction> {
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
     * @see {@link IUln302.getUlnConfig}
     */
    async getUlnConfig(oapp: OmniAddress, uln: OmniAddress, eid: EndpointId): Promise<Uln302UlnConfig> {
        this.logger.debug(`Getting ULN config for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} and ULN ${uln}`)

        const ulnSdk = await this.getUln302SDK(uln)
        return await ulnSdk.getUlnConfig(eid, oapp)
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
        oapp: string,
        uln: OmniAddress,
        eid: EndpointId,
        config: Uln302UlnUserConfig
    ): Promise<boolean> {
        const ulnSdk = await this.getUln302SDK(uln)

        return ulnSdk.hasAppUlnConfig(eid, oapp, config)
    }

    isRegisteredLibrary(uln: OmniAddress): Promise<boolean> {
        return this.contract.contract.isRegisteredLibrary(uln)
    }

    async registerLibrary(uln: OmniAddress): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('registerLibrary', [uln])

        return {
            ...this.createTransaction(data),
            description: `Registering library ${uln}`,
        }
    }

    public async quote(params: MessageParams, sender: OmniAddress): Promise<MessagingFee> {
        const { nativeFee, lzTokenFee } = await this.contract.contract.quote(params, sender)
        return {
            nativeFee: BigInt(nativeFee),
            lzTokenFee: BigInt(lzTokenFee),
        }
    }

    async getUlnConfigParams(uln: OmniAddress, setUlnConfig: Uln302SetUlnConfig[]): Promise<SetConfigParam[]> {
        const ulnSdk = (await this.getUln302SDK(uln)) as Uln302

        return setUlnConfig.map(({ eid, ulnConfig }) => ({
            eid,
            configType: CONFIG_TYPE_ULN,
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
            configType: CONFIG_TYPE_EXECUTOR,
            config: ulnSdk.encodeExecutorConfig(executorConfig),
        }))
    }
}
