// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { OFTAltUpgradeable } from "@layerzerolabs/oft-alt-evm/contracts/OFTAltUpgradeable.sol";

/**
 * @title MyOFTAltUpgradeable
 * @dev Example implementation of OFTAltUpgradeable for projects like Dinari that need to upgrade
 * from regular OFTUpgradeable to OFTAltUpgradeable while maintaining storage compatibility.
 *
 * @dev This contract maintains the same storage layout as OFTUpgradeable but uses alternative
 * payment methods (ERC20 tokens) for LayerZero fees instead of native tokens.
 *
 * @dev IMPORTANT: This contract is designed for UPGRADING from existing OFTUpgradeable deployments.
 * The upgrade process preserves all existing storage (balances, ownership, LayerZero configurations)
 * and no re-initialization is required due to storage compatibility.
 */
contract MyOFTAltUpgradeable is OFTAltUpgradeable {
    /**
     * @dev Constructor for the MyOFTAltUpgradeable contract.
     * @param _lzEndpoint The LayerZero endpoint address (should be an Alt endpoint with ERC20 fee support).
     */
    constructor(address _lzEndpoint) OFTAltUpgradeable(_lzEndpoint) {
        _disableInitializers();
    }

    /**
     * @dev Initializes the contract with name, symbol, and delegate.
     * @param _name The name of the token.
     * @param _symbol The symbol of the token.
     * @param _delegate The delegate capable of making OApp configurations.
     *
     * @dev This function is for INITIAL deployments only, not for upgrades.
     * @dev For upgrades from OFTUpgradeable, no initialization is needed due to storage compatibility.
     */
    function initialize(string memory _name, string memory _symbol, address _delegate) public initializer {
        __OFTAlt_init(_name, _symbol, _delegate);
        __Ownable_init(_delegate);
    }
}
