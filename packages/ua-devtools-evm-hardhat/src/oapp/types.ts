import type { OmniGraphHardhat } from '@layerzerolabs/devtools-evm-hardhat'
import type { OAppEdgeConfig, OAppNodeConfig } from '@layerzerolabs/ua-devtools'

export type OAppOmniGraphHardhat = OmniGraphHardhat<OAppNodeConfig | undefined, OAppEdgeConfig | undefined>
