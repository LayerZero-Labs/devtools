// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { OFTUpgradeable } from "@layerzerolabs/oft-evm-upgradeable/contracts/oft/OFTUpgradeable.sol";

contract MyOFTUpgradeable is OFTUpgradeable {
    constructor(address _lzEndpoint) OFTUpgradeable(_lzEndpoint) {}

    function initialize(string memory _name, string memory _symbol, address _delegate) public initializer {
        __OFT_init(_name, _symbol, _delegate);
        __Ownable_init(_delegate);
    }
}
