// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { MintBurnOFTAdapterUpgradeable, IMintableBurnable } from "@layerzerolabs/oft-evm-upgradeable/contracts/oft/MintBurnOFTAdapterUpgradeable.sol";

contract MyMintBurnOFTAdapterUpgradeable is MintBurnOFTAdapterUpgradeable {
    constructor(
        address _token,
        address _lzEndpoint,
        IMintableBurnable _minterBurner
    ) MintBurnOFTAdapterUpgradeable(_token, _lzEndpoint, _minterBurner) {}

    function initialize(address _delegate) external initializer {
        __MintBurnOFTAdapterUpgradeable_init(_delegate);
        __Ownable_init(_delegate);
    }
}
