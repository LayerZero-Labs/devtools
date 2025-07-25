import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type {
    Uln302ConfigType,
    Uln302ExecutorConfig,
    Uln302UlnConfig,
    Uln302UlnUserConfig,
} from '@layerzerolabs/protocol-devtools'
import { OmniAddress, formatEid } from '@layerzerolabs/devtools'
import { AsyncRetriable } from '@layerzerolabs/devtools'
import { Uln302 } from './sdk'

export class BlockedUln302 extends Uln302 {
    @AsyncRetriable()
    override async getAppUlnConfig(
        eid: EndpointId,
        address: OmniAddress,
        _type: Uln302ConfigType
    ): Promise<Uln302UlnConfig> {
        this.logger.verbose(
            `Returning blocked config for ULN configs for eid ${eid} (${formatEid(eid)}) and OApp ${address} because the message library is BlockedMessageLib`
        )

        // Return a config that indicates the library is blocked
        // Using type(uint8).max for requiredDVNCount to match the contract behavior
        return {
            confirmations: BigInt(0),
            requiredDVNs: [],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
            requiredDVNCount: 255, // type(uint8).max indicates blocked
        }
    }

    /**
     * @see {@link IUln302.hasAppUlnConfig}
     */
    override async hasAppUlnConfig(
        eid: EndpointId,
        oapp: string,
        _config: Uln302UlnUserConfig,
        type: Uln302ConfigType
    ): Promise<boolean> {
        this.logger.verbose(
            `Skipping check for ULN ${type} configs for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} because the message library is BlockedMessageLib`
        )

        return true
    }

    /**
     * @see {@link IUln302.getUlnConfig}
     */
    @AsyncRetriable()
    override async getUlnConfig(
        eid: EndpointId,
        address?: OmniAddress,
        _type?: Uln302ConfigType
    ): Promise<Uln302UlnConfig> {
        this.logger.verbose(
            `Returning blocked config for ULN configs for eid ${eid} (${formatEid(eid)}) and OApp ${address} because the message library is BlockedMessageLib`
        )

        // Return a config that indicates the library is blocked
        return {
            confirmations: BigInt(0),
            requiredDVNs: [],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
            requiredDVNCount: 255, // type(uint8).max indicates blocked
        }
    }

    /**
     * @see {@link IUln302.getAppExecutorConfig}
     */
    @AsyncRetriable()
    override async getAppExecutorConfig(eid: EndpointId, address: OmniAddress): Promise<Uln302ExecutorConfig> {
        this.logger.verbose(
            `Returning blocked config for Executor configs for eid ${eid} (${formatEid(eid)}) and OApp ${address} because the message library is BlockedMessageLib`
        )

        // Return a minimal executor config for blocked lib
        return {
            executor: '0x0000000000000000000000000000000000000000',
            maxMessageSize: 0,
        }
    }

    /**
     * @see {@link IUln302.getExecutorConfig}
     */
    @AsyncRetriable()
    override async getExecutorConfig(eid: EndpointId, address?: OmniAddress): Promise<Uln302ExecutorConfig> {
        this.logger.verbose(
            `Returning blocked config for Executor configs for eid ${eid} (${formatEid(eid)}) and OApp ${address} because the message library is BlockedMessageLib`
        )

        // Return a minimal executor config for blocked lib
        return {
            executor: '0x0000000000000000000000000000000000000000',
            maxMessageSize: 0,
        }
    }

    /**
     * @see {@link IUln302.hasAppExecutorConfig}
     */
    override async hasAppExecutorConfig(
        eid: EndpointId,
        oapp: OmniAddress,
        _config: Uln302ExecutorConfig
    ): Promise<boolean> {
        this.logger.debug(
            `Skipping check for Executor configs for eid ${eid} (${formatEid(eid)}) and OApp ${oapp} because the message library is BlockedMessageLib`
        )

        return true
    }
}
