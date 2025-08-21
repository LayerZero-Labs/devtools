import { EndpointId } from '@layerzerolabs/lz-definitions'

import { DeploymentConfig } from './types'

// ============================================
// OVault Deployment Configuration
// npx hardhat lz:deploy --tags ovault
// ============================================
//
// DEFAULT: You have an ERC4626 vault and assetOFT deployed
// - Set vault.vaultAddress to your existing vault
// - Set vault.assetOFTAddress to your existing asset OFT
// - ShareAdapter, ShareOFT, and Composer will be deployed to integrate with LayerZero
//
// ALTERNATIVE SCENARIOS:
// - New vault, existing asset: Set only assetOFTAddress
// - New vault, new asset: Leave both addresses undefined
// ============================================

// Define the chains we're deploying to
// - _hubEid: The hub chain (where the OVault [ERC4626, ShareOFTAdapter, Composer] is deployed)
// - _spokeEids: The spoke chains (where the ShareOFT is deployed)
const _hubEid = EndpointId.ARBSEP_V2_TESTNET
const _spokeEids = [EndpointId.OPTSEP_V2_TESTNET, EndpointId.BASESEP_V2_TESTNET]

// ============================================
// Deployment Export
// ============================================
//
// This is the configuration for the deployment of the OVault.
//
// ============================================
export const DEPLOYMENT_CONFIG: DeploymentConfig = {
    // Vault chain configuration (where the ERC4626 vault lives)
    vault: {
        eid: _hubEid,
        contracts: {
            vault: 'MyERC4626',
            shareAdapter: 'MyShareOFTAdapter',
            composer: 'MyOVaultComposer',
        },
        // IF YOU HAVE EXISTING CONTRACTS, SET THE ADDRESSES HERE
        // This will skip deployment and use your existing hubEid contract deployments instead
        // This must be the address of the ERC4626 vault
        vaultAddress: undefined, // Set to '0xabc...' to use existing vault
        // This must be the address of the asset OFT (not all OFT addresses are the same as the ERC20 contract)
        assetOFTAddress: undefined, // Set to '0xdef...' to use existing asset OFT
        // This must be the address of the ShareOFTAdapter
        shareOFTAdapterAddress: undefined, // Set to '0xghi...' to use existing ShareOFTAdapter
    },

    // Share OFT configuration (only on spoke chains)
    ShareOFT: {
        contract: 'MyShareOFT',
        metadata: {
            name: 'MyShareOFT',
            symbol: 'SHARE',
        },
        deploymentEids: _spokeEids,
    },

    // Asset OFT configuration (deployed on specified chains OR use existing address)
    AssetOFT: {
        contract: 'MyAssetOFT',
        metadata: {
            name: 'MyAssetOFT',
            symbol: 'ASSET',
        },
        deploymentEids: [_hubEid, ..._spokeEids],
    },
} as const

export const isVaultChain = (eid: number): boolean => eid === DEPLOYMENT_CONFIG.vault.eid
export const shouldDeployVault = (eid: number): boolean => isVaultChain(eid) && !DEPLOYMENT_CONFIG.vault.vaultAddress
export const shouldDeployAsset = (eid: number): boolean =>
    !DEPLOYMENT_CONFIG.vault.assetOFTAddress && DEPLOYMENT_CONFIG.AssetOFT.deploymentEids.includes(eid)
export const shouldDeployShare = (eid: number): boolean =>
    !DEPLOYMENT_CONFIG.vault.shareOFTAdapterAddress && DEPLOYMENT_CONFIG.ShareOFT.deploymentEids.includes(eid)

export const shouldDeployShareAdapter = (eid: number): boolean =>
    isVaultChain(eid) && !DEPLOYMENT_CONFIG.vault.shareOFTAdapterAddress
