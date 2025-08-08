// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OFT } from "@layerzerolabs/oft-evm/contracts/OFT.sol";

/**
 * @title MyAssetOFT
 * @notice ERC20 representation of the vault's asset token on a spoke chain for cross-chain functionality
 * @dev This contract represents the vault's underlying asset on spoke chains. It inherits from
 * LayerZero's OFT (Omnichain Fungible Token) to enable seamless cross-chain transfers of the
 * vault's asset tokens between the hub chain and spoke chains.
 *
 * The asset OFT acts as a bridgeable ERC20 representation of the vault's collateral asset, allowing
 * users to move their assets across supported chains while maintaining fungibility.
 */
contract MyAssetOFT is OFT {
    /**
     * @notice Constructs the Asset OFT contract
     * @dev Initializes the OFT with LayerZero endpoint and sets up ownership
     * @param _name The name of the asset token
     * @param _symbol The symbol of the asset token
     * @param _lzEndpoint The address of the LayerZero endpoint on this chain
     * @param _delegate The address that will have owner privileges
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) OFT(_name, _symbol, _lzEndpoint, _delegate) Ownable(_delegate) {
        // NOTE: Uncomment the line below if you need to mint initial supply
        // This can be useful for testing or if the asset needs initial liquidity
        // _mint(msg.sender, 1 ether);
    }
}