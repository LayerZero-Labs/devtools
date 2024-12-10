import type { OmniGraphHardhat } from '@layerzerolabs/devtools-evm-hardhat'
import type { OAppEdgeConfig, OAppReadNodeConfig } from '@layerzerolabs/ua-devtools'

export type OAppReadOmniGraphHardhat = OmniGraphHardhat<OAppReadNodeConfig | undefined, OAppEdgeConfig | undefined>
