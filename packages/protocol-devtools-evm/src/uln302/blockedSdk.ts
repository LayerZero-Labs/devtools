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
        _eid: EndpointId,
        _address: OmniAddress,
        _type: Uln302ConfigType
    ): Promise<Uln302UlnConfig> {
        throw new Error('BlockedUln302.getAppUlnConfig is not implemented')
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
     * @see {@link IUln302.getExecutorConfig}
     */
    @AsyncRetriable()
    override async getExecutorConfig(
        _eid: EndpointId,
        _address?: OmniAddress | null | undefined
    ): Promise<Uln302ExecutorConfig> {
        throw new Error('BlockedUln302.getExecutorConfig is not implemented')
    }

    /**
     * @see {@link IUln302.getAppExecutorConfig}
     */
    @AsyncRetriable()
    override async getAppExecutorConfig(_eid: EndpointId, _address: OmniAddress): Promise<Uln302ExecutorConfig> {
        throw new Error('BlockedUln302.getAppExecutorConfig is not implemented')
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
