// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { OFTAdapterFeeUpgradeable } from "@layerzerolabs/oft-evm-upgradeable/contracts/oft/OFTAdapterFeeUpgradeable.sol";

contract MyOFTAdapterFeeUpgradeable is OFTAdapterFeeUpgradeable {
    constructor(address _token, address _lzEndpoint) OFTAdapterFeeUpgradeable(_token, _lzEndpoint) {
        _disableInitializers();
    }

    function initialize(address _delegate) public initializer {
        __OFTAdapterFee_init(_delegate);
        __Ownable_init(_delegate);
    }
}
