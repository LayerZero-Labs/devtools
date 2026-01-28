import type { OmniAddress, OmniTransaction } from '@layerzerolabs/devtools'
import type {
    IUln302,
    Uln302ExecutorConfig,
    Uln302UlnConfig,
    Uln302UlnUserConfig,
} from '@layerzerolabs/protocol-devtools'
import { Uln302ConfigType } from '@layerzerolabs/protocol-devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import { OmniSDK, type ConnectionFactory } from '@layerzerolabs/devtools-aptos'

/**
 * Aptos implementation of IUln302
 *
 * This SDK provides methods to interact with the ULN302 (Ultra Light Node) contract on Aptos.
 */
export class Uln302 extends OmniSDK implements IUln302 {
    constructor(point: { eid: EndpointId; address: OmniAddress }, connectionFactory?: ConnectionFactory) {
        // Cast to any to handle potential lz-definitions version mismatches between packages
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        super(point as any, connectionFactory)
    }

    async getUlnConfig(
        eid: EndpointId,
        oapp: OmniAddress | null | undefined,
        type: Uln302ConfigType
    ): Promise<Uln302UlnConfig> {
        try {
            const aptos = await this.getAptos()
            const configTypeNum = type === Uln302ConfigType.Send ? 2 : 3

            const result = await aptos.view({
                payload: {
                    function: `${this.point.address}::uln::get_config`,
                    functionArguments: [oapp, eid, configTypeNum],
                },
            })

            // Parse the result into Uln302UlnConfig
            return this.parseUlnConfig(result)
        } catch {
            // Return default config if not set
            return {
                confirmations: BigInt(0),
                requiredDVNs: [],
                requiredDVNCount: 0,
                optionalDVNs: [],
                optionalDVNThreshold: 0,
            }
        }
    }

    async getAppUlnConfig(eid: EndpointId, oapp: OmniAddress, type: Uln302ConfigType): Promise<Uln302UlnConfig> {
        // For Aptos, getAppUlnConfig is the same as getUlnConfig
        // The default config fallback is handled elsewhere
        return this.getUlnConfig(eid, oapp, type)
    }

    async hasAppUlnConfig(
        eid: EndpointId,
        oapp: OmniAddress,
        config: Uln302UlnUserConfig,
        type: Uln302ConfigType
    ): Promise<boolean> {
        const currentConfig = await this.getAppUlnConfig(eid, oapp, type)

        // Check if confirmations match (if specified)
        if (config.confirmations !== undefined && currentConfig.confirmations !== config.confirmations) {
            return false
        }

        // Check if required DVNs match
        if (config.requiredDVNs) {
            const currentDVNs = new Set(currentConfig.requiredDVNs.map((d) => d.toLowerCase()))
            const configDVNs = config.requiredDVNs.map((d) => d.toLowerCase())
            if (configDVNs.some((d) => !currentDVNs.has(d))) {
                return false
            }
        }

        // Check if optional DVNs match
        if (config.optionalDVNs) {
            const currentDVNs = new Set(currentConfig.optionalDVNs.map((d) => d.toLowerCase()))
            const configDVNs = config.optionalDVNs.map((d) => d.toLowerCase())
            if (configDVNs.some((d) => !currentDVNs.has(d))) {
                return false
            }
        }

        // Check if optional DVN threshold matches (if specified)
        if (
            config.optionalDVNThreshold !== undefined &&
            currentConfig.optionalDVNThreshold !== config.optionalDVNThreshold
        ) {
            return false
        }

        return true
    }

    async setDefaultUlnConfig(_eid: EndpointId, _config: Uln302UlnUserConfig): Promise<OmniTransaction> {
        // This is typically an admin function
        return {
            point: this.point,
            data: '0x',
            description: 'Set default ULN config (admin only)',
        }
    }

    async getExecutorConfig(eid: EndpointId, oapp?: OmniAddress | null | undefined): Promise<Uln302ExecutorConfig> {
        try {
            const aptos = await this.getAptos()

            const result = await aptos.view({
                payload: {
                    function: `${this.point.address}::uln::get_executor_config`,
                    functionArguments: [oapp, eid],
                },
            })

            return {
                maxMessageSize: Number(result[0] ?? 10000),
                executor: (result[1] as string) ?? '0x0',
            }
        } catch {
            // Return default config
            return {
                maxMessageSize: 10000,
                executor: '0x0',
            }
        }
    }

    async getAppExecutorConfig(eid: EndpointId, oapp: OmniAddress): Promise<Uln302ExecutorConfig> {
        // For Aptos, getAppExecutorConfig is the same as getExecutorConfig
        return this.getExecutorConfig(eid, oapp)
    }

    async hasAppExecutorConfig(eid: EndpointId, oapp: OmniAddress, config: Uln302ExecutorConfig): Promise<boolean> {
        const currentConfig = await this.getAppExecutorConfig(eid, oapp)

        // Check if executor matches
        if (currentConfig.executor.toLowerCase() !== config.executor.toLowerCase()) {
            return false
        }

        // Check if max message size matches
        if (currentConfig.maxMessageSize !== config.maxMessageSize) {
            return false
        }

        return true
    }

    async setDefaultExecutorConfig(_eid: EndpointId, _config: Uln302ExecutorConfig): Promise<OmniTransaction> {
        // This is typically an admin function
        return {
            point: this.point,
            data: '0x',
            description: 'Set default executor config (admin only)',
        }
    }

    /**
     * Parse ULN config from view function result
     */
    private parseUlnConfig(result: unknown[]): Uln302UlnConfig {
        // Result structure depends on the Move contract
        // This is a simplified parser
        const requiredDVNs = (result[1] as string[]) ?? []
        return {
            confirmations: BigInt(result[0]?.toString() ?? '0'),
            requiredDVNs,
            requiredDVNCount: requiredDVNs.length,
            optionalDVNs: (result[2] as string[]) ?? [],
            optionalDVNThreshold: Number(result[3] ?? 0),
        }
    }
}
