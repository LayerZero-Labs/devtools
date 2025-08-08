import { EndpointId } from '@layerzerolabs/lz-definitions'

import type { OFTConfigAsset, OFTConfigShare, TokenMetadata, TokenMetadataOrAddress, VaultConfig } from './types'

/// If you have different Assets or Shares per network then you can use an eid mapping to pick them and change deploy script

/// @dev If using a pre-deployed OFT for say asset, then use:
// const assetToken: Token = '0x0000000000000000000000000000000000000000'
const assetOFT: TokenMetadataOrAddress = {
    contractName: 'MyAssetOFT',
    tokenName: 'MyAssetOFT',
    tokenSymbol: 'ASSET',
}

/// @dev Since the vault is a Share ERC20 it uses this tokenName and tokenSymbol
const shareOFT: TokenMetadata = {
    contractName: 'MyShareOFT',
    tokenName: 'MyShareOFT',
    tokenSymbol: 'SHARE',
}

/// @dev If using pre-deployed Vaults, then use the address instead of contractName
const oVaultConfig: VaultConfig = {
    eid: EndpointId.ARBSEP_V2_TESTNET,
    vault: 'MyERC4626',
    shareAdapterContractName: 'MyShareOFTAdapter',
    composer: 'MyOVaultComposer',
}

const assetMesh = [EndpointId.OPTSEP_V2_TESTNET, EndpointId.BASESEP_V2_TESTNET, EndpointId.ARBSEP_V2_TESTNET]
const shareMesh = [EndpointId.OPTSEP_V2_TESTNET, EndpointId.BASESEP_V2_TESTNET]

const assetConfig: OFTConfigAsset = {
    oft: assetOFT,
    networks: assetMesh,
}

const shareConfig: OFTConfigShare = {
    oft: shareOFT,
    networks: shareMesh,
}

export { assetConfig, shareConfig, oVaultConfig }
