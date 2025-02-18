import type { IUlnRead, UlnReadUlnConfig, UlnReadUlnUserConfig } from '@layerzerolabs/protocol-devtools'
import { UlnReadUlnConfigSchema } from '@layerzerolabs/protocol-devtools'
import {
    OmniAddress,
    type OmniTransaction,
    compareBytes32Ascending,
    isDeepEqual,
    OmniPoint,
} from '@layerzerolabs/devtools'
import assert from 'assert'
import { printBoolean, printJson } from '@layerzerolabs/io-devtools'
import { isZero, AsyncRetriable } from '@layerzerolabs/devtools'
import { OmniSDK, Provider, addChecksum, makeZeroAddress } from '@layerzerolabs/devtools-evm'
import { Contract } from '@ethersproject/contracts'
// Although this SDK is not specific to SendUln302, it uses the SendUln302 ABI
// because it contains all the necessary method fragments
import { abi } from '@layerzerolabs/lz-evm-sdk-v2/artifacts/contracts/uln/readlib/ReadLib1002.sol/ReadLib1002.json'

export class UlnRead extends OmniSDK implements IUlnRead {
    constructor(provider: Provider, point: OmniPoint) {
        super({ eid: point.eid, contract: new Contract(point.address, abi).connect(provider) })
    }

    /**
     * @see {@link IUlnRead.getUlnConfig}
     */
    @AsyncRetriable()
    async getUlnConfig(channelId: number, address: OmniAddress | null | undefined): Promise<UlnReadUlnConfig> {
        this.logger.debug(`Getting ULN read config for eid ${channelId} and address ${makeZeroAddress(address)}`)

        const config = await this.contract.contract.getReadLibConfig(makeZeroAddress(address), channelId)
        // Now we convert the ethers-specific object into the common structure
        //
        // Here we need to spread the config into an object because what ethers gives us
        // is actually an array with extra properties
        return UlnReadUlnConfigSchema.parse({ ...config })
    }

    /**
     * @see {@link IUlnRead.getAppUlnConfig}
     */
    @AsyncRetriable()
    async getAppUlnConfig(channelId: number, address: OmniAddress): Promise<UlnReadUlnConfig> {
        this.logger.verbose(
            `Getting App ULN read config for channelId ${channelId} and address ${makeZeroAddress(address)}`
        )

        if (isZero(address)) {
            this.logger.warn(
                `Getting App ULN read config for channelId ${channelId} : Passed in OApp address is zero. This will request the default config.`
            )
        }

        const config = await this.contract.contract.getAppReadLibConfig(makeZeroAddress(address), channelId)

        // Now we convert the ethers-specific object into the common structure
        //
        // Here we need to spread the config into an object because what ethers gives us
        // is actually an array with extra properties
        return UlnReadUlnConfigSchema.parse({ ...config })
    }

    /**
     * @see {@link IUlnRead.hasAppUlnConfig}
     */
    async hasAppUlnConfig(channelId: number, oapp: string, config: UlnReadUlnUserConfig): Promise<boolean> {
        this.logger.verbose(`Checking whether ULN read configs for channelId ${channelId} and OApp ${oapp} match`)

        const currentConfig = await this.getAppUlnConfig(channelId, oapp)
        const currentSerializedConfig = this.serializeUlnConfig(currentConfig)
        const serializedConfig = this.serializeUlnConfig(config)

        this.logger.debug(`Current ULN read config: ${printJson(currentSerializedConfig)}`)
        this.logger.debug(`Incoming ULN read config: ${printJson(serializedConfig)}`)

        const areEqual = isDeepEqual(serializedConfig, currentSerializedConfig)

        return this.logger.verbose(`Checked ULN read configs: ${printBoolean(areEqual)}`), areEqual
    }

    decodeUlnConfig(ulnConfigBytes: string): UlnReadUlnConfig {
        const [rtnConfig] = this.contract.contract.interface.decodeFunctionResult('getReadLibConfig', ulnConfigBytes)

        return UlnReadUlnConfigSchema.parse({ ...rtnConfig })
    }

    encodeUlnConfig(config: UlnReadUlnUserConfig): string {
        const serializedConfig = this.serializeUlnConfig(config)
        const encoded = this.contract.contract.interface.encodeFunctionResult('getReadLibConfig', [serializedConfig])

        return assert(typeof encoded === 'string', 'Must be a string'), encoded
    }

    async setDefaultUlnConfig(channelId: number, config: UlnReadUlnUserConfig): Promise<OmniTransaction> {
        const serializedConfig = this.serializeUlnConfig(config)
        const data = this.contract.contract.interface.encodeFunctionData('setDefaultReadLibConfigs', [
            [
                {
                    eid: channelId,
                    config: serializedConfig,
                },
            ],
        ])

        return {
            ...this.createTransaction(data),
            description: `Setting default ULN config for ${channelId}: ${printJson(serializedConfig)}`,
        }
    }

    /**
     * Prepares the ULN config to be sent to the contract
     *
     * This involves adding two properties that are required by the EVM
     * contracts (for optimization purposes) but don't need to be present
     * in our configuration and ensuring correct checksum on the DVN addresses.
     *
     * @param {UlnReadUlnUserConfig} config
     * @returns {SerializedUlnReadUlnConfig}
     */
    protected serializeUlnConfig({
        requiredDVNs,
        optionalDVNs = [],
        optionalDVNThreshold = 0,
        executor = makeZeroAddress(),
    }: UlnReadUlnUserConfig): SerializedUlnReadUlnConfig {
        return {
            executor,
            requiredDVNCount: requiredDVNs.length,
            optionalDVNCount: optionalDVNs.length,
            optionalDVNThreshold,
            requiredDVNs: requiredDVNs.map(addChecksum).sort(compareBytes32Ascending),
            optionalDVNs: optionalDVNs.map(addChecksum).sort(compareBytes32Ascending),
        }
    }
}

/**
 * Helper type that matches the expected UlnConfig type for the solicity implementation
 */
interface SerializedUlnReadUlnConfig extends UlnReadUlnConfig {
    requiredDVNCount: number
    optionalDVNCount: number
}
