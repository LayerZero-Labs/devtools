import fs from 'node:fs'
import path from 'node:path'

import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'
import { generateConnectionsConfig } from '@layerzerolabs/metadata-tools'
import { OAppEnforcedOption, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

// =============================================================================
// CONFIGURATION
// =============================================================================
// Toggle which VMs to include in your deployment.
// Set to false if you haven't deployed on that VM yet.

const INCLUDE_EVM = true
const INCLUDE_SOLANA = false // Set to true when you deploy Solana OFT
const INCLUDE_SUI = true
const INCLUDE_STARKNET = true

// =============================================================================
// ENFORCED OPTIONS
// =============================================================================
// These define the gas/compute limits for lzReceive on each destination chain.
// The options array order in pathways is [TO_CHAIN_A_OPTIONS, TO_CHAIN_B_OPTIONS].

const EVM_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
    {
        msgType: 1, // SEND
        optionType: ExecutorOptionType.LZ_RECEIVE,
        gas: 80000, // EVM gas units for lzReceive
        value: 0,
    },
]

const SOLANA_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
    {
        msgType: 1,
        optionType: ExecutorOptionType.LZ_RECEIVE,
        gas: 200000, // Compute units for lzReceive on Solana
        value: 2039280, // Lamports for SPL token account rent (required for new recipients)
    },
]

const SUI_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
    {
        msgType: 1,
        optionType: ExecutorOptionType.LZ_RECEIVE,
        gas: 5000, // Sui gas budget for lzReceive
        value: 0,
    },
]

const STARKNET_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
    {
        msgType: 1,
        optionType: ExecutorOptionType.LZ_RECEIVE,
        gas: 500000, // Cairo steps for lzReceive on Starknet
        value: 0,
    },
]

// =============================================================================
// DEPLOYMENT TYPES
// =============================================================================

type SolanaDeployment = { oftStore: string }
type SuiDeployment = { oftPackageId: string }
type StarknetDeployment = { oftAddress: string }

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Safely load a JSON deployment file. Returns null if file doesn't exist.
 */
const loadJsonOptional = <T>(relativePath: string): T | null => {
    const fullPath = path.join(__dirname, relativePath)
    if (!fs.existsSync(fullPath)) {
        return null
    }
    return JSON.parse(fs.readFileSync(fullPath, 'utf8')) as T
}

/**
 * Get Solana OFT store address from deployment file.
 */
const getSolanaOftStore = (): string | null => {
    // Check mainnet first, then testnet
    const mainnet = loadJsonOptional<SolanaDeployment>('./deployments/solana-mainnet/OFT.json')
    if (mainnet?.oftStore) return mainnet.oftStore

    const testnet = loadJsonOptional<SolanaDeployment>('./deployments/solana-testnet/OFT.json')
    return testnet?.oftStore ?? null
}

// =============================================================================
// CONTRACT DEFINITIONS
// =============================================================================

// EVM Contract (loaded via hardhat-deploy, no address needed)
const arbitrumContract: OmniPointHardhat = {
    eid: EndpointId.ARBITRUM_V2_MAINNET,
    contractName: 'MyOFT',
}

// Solana Contract
const solanaDeployment = getSolanaOftStore()
const solanaContract: OmniPointHardhat | null =
    INCLUDE_SOLANA && solanaDeployment
        ? {
              eid: EndpointId.SOLANA_V2_MAINNET,
              address: solanaDeployment,
          }
        : null

// Sui Contract
const suiDeployment = loadJsonOptional<SuiDeployment>('./sui/deploy.json')
const suiContract: OmniPointHardhat | null =
    INCLUDE_SUI && suiDeployment?.oftPackageId
        ? {
              eid: EndpointId.SUI_V2_MAINNET,
              address: suiDeployment.oftPackageId,
          }
        : null

// Starknet Contract
const starknetDeployment = loadJsonOptional<StarknetDeployment>('./starknet/deploy.json')
const starknetContract: OmniPointHardhat | null =
    INCLUDE_STARKNET && starknetDeployment?.oftAddress
        ? {
              eid: EndpointId.STARKNET_V2_MAINNET,
              address: starknetDeployment.oftAddress,
          }
        : null

// =============================================================================
// PATHWAY GENERATION
// =============================================================================

/**
 * Generate all pathways between enabled contracts.
 * Pathways are bidirectional - declaring A↔B covers both directions.
 *
 * Pathway tuple format:
 * [contractA, contractB, dvnConfig, confirmations, enforcedOptions]
 *
 * enforcedOptions order: [TO_B_OPTIONS, TO_A_OPTIONS]
 * - First element: options when sending FROM A TO B
 * - Second element: options when sending FROM B TO A
 */
type Pathway = readonly [
    OmniPointHardhat,
    OmniPointHardhat,
    readonly [readonly string[], readonly string[]],
    readonly [number, number],
    readonly [OAppEnforcedOption[], OAppEnforcedOption[]],
]

const generatePathways = (): Pathway[] => {
    const pathways: Pathway[] = []
    const contracts: Array<{
        contract: OmniPointHardhat
        options: OAppEnforcedOption[]
        dvns: readonly string[]
    }> = []

    // Add enabled contracts
    if (INCLUDE_EVM) {
        contracts.push({ contract: arbitrumContract, options: EVM_ENFORCED_OPTIONS, dvns: ['LayerZero Labs'] })
    }
    if (solanaContract) {
        contracts.push({ contract: solanaContract, options: SOLANA_ENFORCED_OPTIONS, dvns: ['LayerZero Labs'] })
    }
    if (suiContract) {
        contracts.push({ contract: suiContract, options: SUI_ENFORCED_OPTIONS, dvns: [] })
    }
    if (starknetContract) {
        contracts.push({ contract: starknetContract, options: STARKNET_ENFORCED_OPTIONS, dvns: [] })
    }

    // Generate full mesh pathways
    for (let i = 0; i < contracts.length; i++) {
        for (let j = i + 1; j < contracts.length; j++) {
            const a = contracts[i]!
            const b = contracts[j]!
            pathways.push([
                a.contract,
                b.contract,
                [a.dvns, b.dvns] as const,
                [15, 15] as const, // confirmations
                [b.options, a.options] as const, // [TO_B, TO_A]
            ])
        }
    }

    return pathways
}

// =============================================================================
// EXPORT CONFIG
// =============================================================================

export default async function () {
    const pathways = generatePathways()
    const connections = await generateConnectionsConfig(pathways as any)

    // Build contracts array from enabled contracts
    const contracts: Array<{ contract: OmniPointHardhat }> = []
    if (INCLUDE_EVM) contracts.push({ contract: arbitrumContract })
    if (solanaContract) contracts.push({ contract: solanaContract })
    if (suiContract) contracts.push({ contract: suiContract })
    if (starknetContract) contracts.push({ contract: starknetContract })

    console.log(`LayerZero Config: ${contracts.length} contracts, ${pathways.length} pathways`)
    console.log(`  Contracts: ${contracts.map((c) => c.contract.eid).join(', ')}`)

    return { contracts, connections }
}
