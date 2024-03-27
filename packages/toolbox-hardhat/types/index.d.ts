// Since tsup would drop all the type imports, we would lose the type extensions
// from @layerzerolabs/devtools-evm-hardhat
//
// To fix this, we will create a d.ts file instead of having one created during the build
import '@layerzerolabs/devtools-evm-hardhat/type-extensions'

// We re-export all the relevant types from devtools
export type { OmniPointHardhat, OmniEdgeHardhat, OmniDeployment } from '@layerzerolabs/devtools-evm-hardhat'
export type { OmniPoint, OmniVector, OmniNode, OmniEdge, OmniGraph } from '@layerzerolabs/devtools'

// We also re-export all the relevant types from ua-devtools
export type { OAppOmniGraphHardhat } from '@layerzerolabs/ua-devtools-evm-hardhat'
