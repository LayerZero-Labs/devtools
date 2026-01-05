import { EndpointId } from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'
import { TwoWayConfig, generateConnectionsConfig } from '@layerzerolabs/metadata-tools'
import { OAppEnforcedOption } from '@layerzerolabs/toolbox-hardhat'

import type { OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

// ======================================
// SECTION 1: CONTRACT DEFINITIONS
// ======================================
// This example demonstrates the primary use case for OFTAlt:
// Connecting an OFTAlt on a chain with an Alt Endpoint (ERC20 fee payment)
// to standard OFT contracts on regular EVM chains (native gas fee payment).
//
// Primary scenario:
// - OFTAlt deployed on Tempo (Alt Endpoint - fees paid in stablecoins)
// - Standard OFT deployed on Arbitrum (regular EndpointV2 - fees paid in native gas)

// ========== ALT ENDPOINT CHAINS ==========
// OFTAlt on chains with EndpointV2Alt (ERC20 fee payment)
// Tempo is a payments-focused blockchain where fees are paid in TIP-20 stablecoins
const tempoContract: OmniPointHardhat = {
    eid: EndpointId.TEMPO_V2_TESTNET,
    contractName: 'MyOFTAlt', // OFTAlt for Alt Endpoint chains (ERC20 fee payment)
}

// ========== STANDARD EVM CHAINS ==========
// Standard OFT on chains with regular EndpointV2 (native gas fee payment)
const arbitrumContract: OmniPointHardhat = {
    eid: EndpointId.ARBSEP_V2_TESTNET,
    contractName: 'MyOFT', // Standard OFT for regular EVM chains
}

// ======================================
// SECTION 2: ENFORCED OPTIONS
// ======================================
// Define the gas options for destination chain execution.
// These options ensure a minimum gas amount is provided for lzReceive execution.
//
// For production, profile your contract's lzReceive gas usage on each destination
// chain and set appropriate values. The values below are examples.
//
// Learn more: https://docs.layerzero.network/v2/concepts/applications/oapp-standard#execution-options-and-enforced-settings

const EVM_ENFORCED_OPTIONS: OAppEnforcedOption[] = [
    {
        msgType: 1, // SEND message type
        optionType: ExecutorOptionType.LZ_RECEIVE,
        gas: 80000, // Gas limit for lzReceive on destination
        value: 0, // Native value to send (usually 0 for OFT)
    },
]

// ======================================
// SECTION 3: PATHWAY CONFIGURATION
// ======================================
// Define bidirectional pathways between contracts.
// The Simple Config Generator automatically creates both directions (A→B and B→A).
//
// Each pathway specifies:
// - Contract pair (source, destination)
// - DVN configuration: [ [requiredDVNs], [optionalDVNs, threshold] ]
// - Block confirmations: [A→B confirmations, B→A confirmations]
// - Enforced options: [B's enforcedOptions, A's enforcedOptions]
//
// For production, configure appropriate DVNs for your security requirements.
// See: https://docs.layerzero.network/v2/developers/evm/configuration/dvn-executor-config

const pathways: TwoWayConfig[] = [
    // Tempo (Alt Endpoint) <-> Arbitrum (Standard Endpoint)
    // This demonstrates the primary use case: OFTAlt on Alt chain ↔ OFT on standard chain
    [
        tempoContract, // Alt Endpoint chain (OFTAlt with ERC20 fees)
        arbitrumContract, // Standard chain (OFT with native gas fees)
        [['LayerZero Labs'], []], // DVNs: Required=[LayerZero Labs], Optional=[]
        [1, 1], // Block confirmations (increase for mainnet)
        [EVM_ENFORCED_OPTIONS, EVM_ENFORCED_OPTIONS], // Enforced options
    ],
]

// ======================================
// SECTION 4: EXPORT CONFIGURATION
// ======================================
// The generateConnectionsConfig function creates the full connection configuration
// from the pathway definitions, including DVN addresses and executor settings
// resolved from LayerZero metadata.

export default async function () {
    const connections = await generateConnectionsConfig(pathways)
    return {
        contracts: [{ contract: tempoContract }, { contract: arbitrumContract }],
        connections,
    }
}
