// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";

/**
 * @title MyShareOFT
 * @notice ERC20 representation of the vault's share token on a spoke chain for cross-chain functionality
 * @dev This contract represents the vault's share tokens on spoke chains. It inherits from
 * LayerZero's OFT (Omnichain Fungible Token) to enable seamless cross-chain transfers of
 * vault shares between the hub chain and spoke chains. This contract is designed to work
 * with ERC4626-compliant vaults, enabling standardized cross-chain vault interactions.
 *
 * Share tokens represent ownership in the vault and can be redeemed for the underlying
 * asset on the hub chain. The OFT mechanism ensures that shares maintain their value and can be freely
 * moved across supported chains while preserving the vault's accounting integrity.
 */
contract MyShareOFT is OFT {
    /**
     * @notice Constructs the Share OFT contract
     * @dev Initializes the OFT with LayerZero endpoint and sets up ownership
     * @param _name The name of the share token
     * @param _symbol The symbol of the share token
     * @param _lzEndpoint The address of the LayerZero endpoint on this chain
     * @param _delegate The address that will have owner privileges
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) OFT(_name, _symbol, _lzEndpoint, _delegate) Ownable(_delegate) {
        // WARNING: Do NOT mint share tokens directly as this breaks the vault's share-to-asset ratio
        // Share tokens should only be minted by the vault contract during deposits to maintain
        // the correct relationship between shares and underlying assets
        // _mint(msg.sender, 1 ether); // ONLY uncomment for testing UI/integration, never in production
    }
}
