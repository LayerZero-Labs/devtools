// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Origin } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import { OFTUpgradeable } from "@layerzerolabs/oft-evm-upgradeable/contracts/oft/OFTUpgradeable.sol";

/**
 * @title OFTUpgradeableBaseMock
 * @dev Base mock without UUPS restrictions for storage equivalency testing
 */
contract OFTUpgradeableBaseMock is OFTUpgradeable {
    constructor(address _lzEndpoint) OFTUpgradeable(_lzEndpoint) {}

    function initialize(string memory _name, string memory _symbol, address _delegate) external initializer {
        __OFT_init(_name, _symbol, _delegate);
        __Ownable_init(_delegate);
    }

    // Mint function for testing
    function mint(address _to, uint256 _amount) public {
        _mint(_to, _amount);
    }
}

/**
 * @title OFTUpgradeableTUPMock
 * @dev Mock contract for Transparent Upgradeable Proxy (TUP) migration testing
 */
contract OFTUpgradeableTUPMock is OFTUpgradeable {
    constructor(address _lzEndpoint) OFTUpgradeable(_lzEndpoint) {
        _disableInitializers();
    }

    function initialize(string memory _name, string memory _symbol, address _delegate) external initializer {
        __OFT_init(_name, _symbol, _delegate);
        __Ownable_init(_delegate);
    }

    // Mint function for testing
    function mint(address _to, uint256 _amount) public {
        _mint(_to, _amount);
    }
}

/**
 * @title OFTUpgradeableUUPSMock
 * @dev Mock contract for UUPS migration testing
 */
contract OFTUpgradeableUUPSMock is OFTUpgradeable, UUPSUpgradeable {
    constructor(address _lzEndpoint) OFTUpgradeable(_lzEndpoint) {
        _disableInitializers();
    }

    function initialize(string memory _name, string memory _symbol, address _delegate) external initializer {
        __OFT_init(_name, _symbol, _delegate);
        __Ownable_init(_delegate);
        __UUPSUpgradeable_init();
    }

    // Mint function for testing
    function mint(address _to, uint256 _amount) public {
        _mint(_to, _amount);
    }

    // Required for UUPS upgradeability
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
