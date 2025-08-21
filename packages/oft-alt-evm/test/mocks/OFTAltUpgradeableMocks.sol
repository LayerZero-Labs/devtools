// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Origin } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import { OFTAltUpgradeable } from "../../contracts/OFTAltUpgradeable.sol";

/**
 * @title OFTAltUpgradeableBaseMock
 * @dev Base mock without UUPS restrictions for storage equivalency testing
 * @dev To be equivalent to ERC1967Proxy
 */
contract OFTAltUpgradeableBaseMock is OFTAltUpgradeable {
    constructor(address _lzEndpoint) OFTAltUpgradeable(_lzEndpoint) {}

    function initialize(string memory _name, string memory _symbol, address _delegate) external initializer {
        __OFTAlt_init(_name, _symbol, _delegate);
        __Ownable_init(_delegate);
    }

    // Mint function for testing
    function mint(address _to, uint256 _amount) public {
        _mint(_to, _amount);
    }
}

/**
 * @title OFTAltUpgradeableTUPMock
 * @dev Mock contract for Transparent Upgradeable Proxy (TUP) migration testing
 */
contract OFTAltUpgradeableTUPMock is OFTAltUpgradeable {
    constructor(address _lzEndpoint) OFTAltUpgradeable(_lzEndpoint) {
        _disableInitializers();
    }

    function initialize(string memory _name, string memory _symbol, address _delegate) external initializer {
        __OFTAlt_init(_name, _symbol, _delegate);
        __Ownable_init(_delegate);
    }

    // Mint function for testing
    function mint(address _to, uint256 _amount) public {
        _mint(_to, _amount);
    }
}

/**
 * @title OFTAltUpgradeableUUPSMock
 * @dev Mock contract for UUPS migration testing
 */
contract OFTAltUpgradeableUUPSMock is OFTAltUpgradeable, UUPSUpgradeable {
    constructor(address _lzEndpoint) OFTAltUpgradeable(_lzEndpoint) {}

    function initialize(string memory _name, string memory _symbol, address _delegate) external initializer {
        __OFTAlt_init(_name, _symbol, _delegate);
        __Ownable_init(_delegate);
        __UUPSUpgradeable_init();
    }

    // Mint function for testing
    function mint(address _to, uint256 _amount) public {
        _mint(_to, _amount);
    }

    function _authorizeUpgrade(address) internal view override onlyOwner {}
}
