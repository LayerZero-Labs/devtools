import type { Token, Vault } from './types'

/// If you have different Assets or Shares per network then you can use an eid mapping to pick them and change deploy script

/// @dev If using a pre-deployed OFT for say asset, then use:
// const assetToken: Token = '0x0000000000000000000000000000000000000000'

const assetToken: Token = {
    contractName: 'MyAssetOFT',
    tokenName: 'MyAssetOFT',
    tokenSymbol: 'ASSET',
}

/// @dev Since the vault is a Share ERC20 it uses this tokenName and tokenSymbol
const shareToken: Token = {
    contractName: 'MyShareOFT',
    tokenName: 'MyShareOFT',
    tokenSymbol: 'SHARE',
}

/// @dev If using pre-deployed Vaults, then use the address instead of contractName
const oVault: Vault = {
    vault: 'MyERC4626',
    shareAdapterContractName: 'MyShareOFTAdapter',
    composer: 'MyOVaultComposer',
}

export { assetToken, shareToken, oVault }
