import { MessageParams, MessagingFee, TimeoutSchema } from '@layerzerolabs/protocol-devtools'
import assert from 'assert'
import type {
    IEndpoint,
    IUln302,
    SetConfigParam,
    Uln302ExecutorConfig,
    Uln302Factory,
    Uln302SetUlnConfig,
    Uln302UlnConfig,
} from '@layerzerolabs/protocol-devtools'
import { formatEid, type Address, type OmniTransaction, formatOmniPoint, Bytes32 } from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import { ignoreZero, isZero, makeZeroAddress, type OmniContract, OmniSDK } from '@layerzerolabs/devtools-evm'
import { Timeout } from '@layerzerolabs/protocol-devtools'
import { Uln302 } from '@/uln302'
import { Uln302SetExecutorConfig } from '@layerzerolabs/protocol-devtools'
import { printJson } from '@layerzerolabs/io-devtools'

const CONFIG_TYPE_EXECUTOR = 1
const CONFIG_TYPE_ULN = 2

export class Endpoint extends OmniSDK implements IEndpoint {
    constructor(
        contract: OmniContract,
        private readonly uln302Factory: Uln302Factory
    ) {
        super(contract)
    }

    async getUln302SDK(address: Address): Promise<IUln302> {
        this.logger.debug(`Getting Uln302 SDK for address ${address}`)

        assert(
            !isZero(address),
            `Uln302 cannot be instantiated: Uln302 address cannot be a zero value for Endpoint ${formatOmniPoint(
                this.point
            )}`
        )

        return await this.uln302Factory({ eid: this.point.eid, address })
    }

    async getDefaultReceiveLibrary(eid: EndpointId): Promise<Address | undefined> {
        this.logger.debug(`Getting default receive library for eid ${eid} (${formatEid(eid)})`)

        return ignoreZero(await this.contract.contract.defaultReceiveLibrary(eid))
    }

    async getSendLibrary(sender: Address, dstEid: EndpointId): Promise<Address | undefined> {
        this.logger.debug(`Getting send library for eid ${dstEid} (${formatEid(dstEid)}) and address ${sender}`)

        return ignoreZero(await this.contract.contract.getSendLibrary(sender, dstEid))
    }

    async getReceiveLibrary(
        receiver: Address,
        srcEid: EndpointId
    ): Promise<[address: Address | undefined, isDefault: boolean]> {
        this.logger.debug(`Getting receive library for eid ${srcEid} (${formatEid(srcEid)}) and address ${receiver}`)

        return await this.contract.contract.getReceiveLibrary(receiver, srcEid)
    }

    async setDefaultReceiveLibrary(
        eid: EndpointId,
        lib: Address | null | undefined,
        gracePeriod: number = 0
    ): Promise<OmniTransaction> {
        this.logger.debug(
            `Setting default receive library for eid ${eid} (${formatEid(eid)}) and address ${lib} with grace perriod of ${gracePeriod}`
        )

        const data = this.contract.contract.interface.encodeFunctionData('setDefaultReceiveLibrary', [
            eid,
            makeZeroAddress(lib),
            gracePeriod,
        ])

        return {
            ...this.createTransaction(data),
            description: `Setting default receive library for ${formatEid(eid)} to ${makeZeroAddress(lib)}`,
        }
    }

    async getDefaultSendLibrary(eid: EndpointId): Promise<Address | undefined> {
        this.logger.debug(`Getting default send library for eid ${eid} (${formatEid(eid)})`)

        return ignoreZero(await this.contract.contract.defaultSendLibrary(eid))
    }

    async isDefaultSendLibrary(sender: Bytes32 | Address, dstEid: EndpointId): Promise<boolean> {
        this.logger.debug(
            `Checking default send library for eid ${dstEid} (${formatEid(dstEid)}) and address ${sender}`
        )

        if (isZero(sender)) {
            this.logger.warn(`Checking default send library received a zero address (${sender}) for eid ${dstEid}`)
        }

        return await this.contract.contract.isDefaultSendLibrary(sender, dstEid)
    }

    async setDefaultSendLibrary(eid: EndpointId, lib: Address | null | undefined): Promise<OmniTransaction> {
        this.logger.debug(`Setting default send library for eid ${eid} (${formatEid(eid)}) and address ${lib}`)

        const data = this.contract.contract.interface.encodeFunctionData('setDefaultSendLibrary', [
            eid,
            makeZeroAddress(lib),
        ])

        return {
            ...this.createTransaction(data),
            description: `Setting default send library for ${formatEid(eid)} to ${lib}`,
        }
    }

    async setSendLibrary(oapp: Address, eid: EndpointId, newLib: Address | null | undefined): Promise<OmniTransaction> {
        this.logger.debug(
            `Setting send library for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} to address ${newLib}`
        )

        const data = this.contract.contract.interface.encodeFunctionData('setSendLibrary', [oapp, eid, newLib])

        return {
            ...this.createTransaction(data),
            description: `Setting send library for ${formatEid(eid)} to ${newLib}`,
        }
    }

    async setReceiveLibrary(
        oapp: Address,
        eid: EndpointId,
        newLib: Address | null | undefined,
        gracePeriod: number
    ): Promise<OmniTransaction> {
        this.logger.debug(
            `Setting send library for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} to address ${newLib} with a grace period of ${gracePeriod}`
        )

        const data = this.contract.contract.interface.encodeFunctionData('setReceiveLibrary', [
            oapp,
            eid,
            newLib,
            gracePeriod,
        ])

        return {
            ...this.createTransaction(data),
            description: `Setting receive library for ${formatEid(eid)} to ${newLib} with grace period ${gracePeriod}`,
        }
    }

    async getReceiveLibraryTimeout(receiver: Address, srcEid: EndpointId): Promise<Timeout> {
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
        oapp: Address,
        eid: EndpointId,
        lib: Address | null | undefined,
        expiry: number
    ): Promise<OmniTransaction> {
        this.logger.debug(
            `Setting receive library timeout for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} to address ${makeZeroAddress(lib)} with expiration period ${expiry}`
        )

        const data = this.contract.contract.interface.encodeFunctionData('setReceiveLibraryTimeout', [
            oapp,
            eid,
            lib,
            expiry,
        ])

        return {
            ...this.createTransaction(data),
            description: `Setting receive library timeout for ${formatEid(
                eid
            )} to ${lib} with expiration period ${expiry}`,
        }
    }

    async setConfig(oapp: Address, lib: Address, setConfigParam: SetConfigParam[]): Promise<OmniTransaction> {
        this.logger.debug(`Setting config for OApp ${oapp} to address ${lib} with config ${printJson(setConfigParam)}`)

        const data = this.contract.contract.interface.encodeFunctionData('setConfig', [oapp, lib, setConfigParam])
        return {
            ...this.createTransaction(data),
            description: `SetConfig for lib: ${lib}`,
        }
    }

    async setUlnConfig(oapp: Address, lib: Address, setUlnConfig: Uln302SetUlnConfig[]): Promise<OmniTransaction> {
        this.logger.debug(
            `Setting ULN config for OApp ${oapp} to address ${lib} with config ${printJson(setUlnConfig)}`
        )

        const setUlnConfigParams: SetConfigParam[] = await this.getUlnConfigParams(lib, setUlnConfig)
        return await this.setConfig(oapp, lib, setUlnConfigParams)
    }

    async setExecutorConfig(
        oapp: Address,
        lib: Address,
        setExecutorConfig: Uln302SetExecutorConfig[]
    ): Promise<OmniTransaction> {
        this.logger.debug(
            `Setting executor config for OApp ${oapp} to address ${lib} with config ${printJson(setExecutorConfig)}`
        )

        const setExecutorConfigParams: SetConfigParam[] = await this.getExecutorConfigParams(lib, setExecutorConfig)
        return await this.setConfig(oapp, lib, setExecutorConfigParams)
    }

    async getExecutorConfigOrDefault(
        oapp: Bytes32 | Address,
        lib: Address,
        eid: EndpointId
    ): Promise<Uln302ExecutorConfig> {
        this.logger.debug(
            `Getting executor config or default for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} and address ${lib}`
        )

        const uln = await this.getUln302SDK(lib)
        return await uln.getExecutorConfigOrDefault(eid, oapp)
    }

    async getExecutorConfig(oapp: Bytes32 | Address, lib: Address, eid: EndpointId): Promise<Uln302ExecutorConfig> {
        this.logger.debug(
            `Getting executor app config for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} and address ${lib}`
        )

        const uln = await this.getUln302SDK(lib)
        return await uln.getExecutorConfig(eid, oapp)
    }

    async getUlnConfigOrDefault(oapp: Bytes32 | Address, lib: Address, eid: EndpointId): Promise<Uln302UlnConfig> {
        this.logger.debug(
            `Getting ULN config or default for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} and address ${lib}`
        )

        const uln = await this.getUln302SDK(lib)
        return await uln.getUlnConfigOrDefault(eid, oapp)
    }

    async getUlnConfig(oapp: Bytes32 | Address, lib: Address, eid: EndpointId): Promise<Uln302UlnConfig> {
        this.logger.debug(
            `Getting App ULN config for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} and address ${lib}`
        )

        const uln = await this.getUln302SDK(lib)
        return await uln.getUlnConfig(eid, oapp)
    }

    isRegisteredLibrary(lib: Address): Promise<boolean> {
        return this.contract.contract.isRegisteredLibrary(lib)
    }

    async registerLibrary(lib: Address): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('registerLibrary', [lib])

        return {
            ...this.createTransaction(data),
            description: `Registering library ${lib}`,
        }
    }

    public async quote(params: MessageParams, sender: Address): Promise<MessagingFee> {
        const { nativeFee, lzTokenFee } = await this.contract.contract.quote(params, sender)
        return {
            nativeFee: BigInt(nativeFee),
            lzTokenFee: BigInt(lzTokenFee),
        }
    }

    async getUlnConfigParams(lib: Address, setUlnConfig: Uln302SetUlnConfig[]): Promise<SetConfigParam[]> {
        const uln = (await this.getUln302SDK(lib)) as Uln302
        return setUlnConfig.map(({ eid, ulnConfig }) => ({
            eid,
            configType: CONFIG_TYPE_ULN,
            config: uln.encodeUlnConfig(ulnConfig),
        }))
    }

    async getExecutorConfigParams(
        lib: Address,
        setExecutorConfig: Uln302SetExecutorConfig[]
    ): Promise<SetConfigParam[]> {
        const uln = (await this.getUln302SDK(lib)) as Uln302
        return setExecutorConfig.map(({ eid, executorConfig }) => ({
            eid,
            configType: CONFIG_TYPE_EXECUTOR,
            config: uln.encodeExecutorConfig(executorConfig),
        }))
    }
}
