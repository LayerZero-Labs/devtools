// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { OFTFeeUpgradeable } from "@layerzerolabs/oft-evm-upgradeable/contracts/oft/OFTFeeUpgradeable.sol";

contract MyOFTFeeUpgradeable is OFTFeeUpgradeable {
    constructor(address _lzEndpoint) OFTFeeUpgradeable(_lzEndpoint) {
        _disableInitializers();
    }

    function initialize(string memory _name, string memory _symbol, address _delegate) public initializer {
        __OFTFee_init(_name, _symbol, _delegate);
        __Ownable_init(_delegate);
    }
}
