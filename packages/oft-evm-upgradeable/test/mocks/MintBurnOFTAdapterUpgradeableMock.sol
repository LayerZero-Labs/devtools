// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { MintBurnOFTAdapterUpgradeable } from "../../contracts/oft/MintBurnOFTAdapterUpgradeable.sol";
import { IMintableBurnable } from "@layerzerolabs/oft-evm/contracts/interfaces/IMintableBurnable.sol";

contract MintBurnOFTAdapterUpgradeableMock is MintBurnOFTAdapterUpgradeable {
    constructor(
        address _token,
        address _lzEndpoint,
        IMintableBurnable _minterBurner
    ) MintBurnOFTAdapterUpgradeable(_token, _lzEndpoint, _minterBurner) {}

    function initialize(address _delegate) external initializer {
        __MintBurnOFTAdapterUpgradeable_init(_delegate);
        __Ownable_init(_delegate);
    }

    // @dev expose internal functions for testing purposes
    function debit(
        uint256 _amountToSendLD,
        uint256 _minAmountToCreditLD,
        uint32 _dstEid
    ) public returns (uint256 amountDebitedLD, uint256 amountToCreditLD) {
        return _debit(msg.sender, _amountToSendLD, _minAmountToCreditLD, _dstEid);
    }

    function debitView(
        uint256 _amountToSendLD,
        uint256 _minAmountToCreditLD,
        uint32 _dstEid
    ) public view returns (uint256 amountDebitedLD, uint256 amountToCreditLD) {
        return _debitView(_amountToSendLD, _minAmountToCreditLD, _dstEid);
    }

    function credit(address _to, uint256 _amountToCreditLD, uint32 _srcEid) public returns (uint256 amountReceivedLD) {
        return _credit(_to, _amountToCreditLD, _srcEid);
    }

    function removeDust(uint256 _amountLD) public view returns (uint256 amountLD) {
        return _removeDust(_amountLD);
    }
}
