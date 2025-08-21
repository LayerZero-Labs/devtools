import { EndpointId } from '@layerzerolabs/lz-definitions'

// ============================================
// OVault Deployment Configuration
// npx hardhat lz:deploy --tags ovault
// ============================================
//
// DEFAULT SCENARIO: You have an ERC4626 vault and asset deployed
// - Set vault.vaultAddress to your existing vault
// - Set vault.assetAddress to your existing asset
// - ShareAdapter, ShareOFT, and Composer will be deployed to integrate with LayerZero
//
// ALTERNATIVE SCENARIOS:
// - New vault, existing asset: Set only assetAddress
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
export const DEPLOYMENT_CONFIG = {
    // Vault chain configuration (where the ERC4626 vault lives)
    vault: {
        eid: _hubEid,
        contracts: {
            vault: 'MyERC4626',
            shareAdapter: 'MyShareOFTAdapter',
            composer: 'MyOVaultComposer',
        },
        // IF YOU HAVE EXISTING CONTRACTS, SET THE ADDRESSES HERE
        // This will skip deployment and use your existing contracts instead
        vaultAddress: undefined, // Set to '0x...' to use existing vault
        assetAddress: undefined, // Set to '0x...' to use existing asset
    },

    // Share OFT configuration (only on spoke chains)
    share: {
        contract: 'MyShareOFT',
        metadata: {
            name: 'MyShareOFT',
            symbol: 'SHARE',
        },
        deploymentEids: _spokeEids,
    },

    // Asset OFT configuration (Optional: If you do not have an asset deployed, you can deploy it here)
    asset: {
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
    !DEPLOYMENT_CONFIG.vault.assetAddress && DEPLOYMENT_CONFIG.asset.deploymentEids.includes(eid)
export const shouldDeployShare = (eid: number): boolean => DEPLOYMENT_CONFIG.share.deploymentEids.includes(eid)
