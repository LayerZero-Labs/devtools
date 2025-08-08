import { EndpointId } from '@layerzerolabs/lz-definitions'

export const DEPLOYMENT_CONFIG = {
    // Hub chain configuration
    hub: {
        eid: EndpointId.ARBSEP_V2_TESTNET,
        contracts: {
            vault: 'MyERC4626',
            shareAdapter: 'MyShareOFTAdapter',
            composer: 'MyOVaultComposer',
        },
    },

    // Asset OFT configuration (deployed on all chains)
    asset: {
        contract: 'MyAssetOFT',
        metadata: {
            name: 'MyAssetOFT',
            symbol: 'ASSET',
        },
        chains: [EndpointId.OPTSEP_V2_TESTNET, EndpointId.BASESEP_V2_TESTNET, EndpointId.ARBSEP_V2_TESTNET],
    },

    // Share OFT configuration (only on spoke chains)
    share: {
        contract: 'MyShareOFT',
        metadata: {
            name: 'MyShareOFT',
            symbol: 'SHARE',
        },
        chains: [EndpointId.OPTSEP_V2_TESTNET, EndpointId.BASESEP_V2_TESTNET], // No hub chain
    },
} as const

export const isHubChain = (eid: number): boolean => eid === DEPLOYMENT_CONFIG.hub.eid
export const shouldDeployAsset = (eid: number): boolean => DEPLOYMENT_CONFIG.asset.chains.includes(eid)
export const shouldDeployShare = (eid: number): boolean => DEPLOYMENT_CONFIG.share.chains.includes(eid)
