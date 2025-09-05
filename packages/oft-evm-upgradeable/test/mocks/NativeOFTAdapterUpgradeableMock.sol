// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { NativeOFTAdapterUpgradeable } from "../../contracts/oft/NativeOFTAdapterUpgradeable.sol";
import { SendParam } from "../../contracts/oft/OFTCoreUpgradeable.sol";

contract NativeOFTAdapterUpgradeableMock is NativeOFTAdapterUpgradeable {
    constructor(uint8 _localDecimals, address _lzEndpoint) NativeOFTAdapterUpgradeable(_localDecimals, _lzEndpoint) {
        _disableInitializers();
    }

    function initialize(address _delegate) external initializer {
        __NativeOFTAdapter_init(_delegate);
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

    function buildMsgAndOptions(
        SendParam calldata _sendParam,
        uint256 _amountToCreditLD
    ) public view returns (bytes memory message, bytes memory options) {
        return _buildMsgAndOptions(_sendParam, _amountToCreditLD);
    }

    function toLD(uint64 _amountSD) public view returns (uint256 amountLD) {
        return _toLD(_amountSD);
    }

    function toSD(uint256 _amountLD) public view returns (uint64 amountSD) {
        return _toSD(_amountLD);
    }

    // @dev For compatibility with OFT test cases that expect balanceOf()
    function balanceOf(address _account) public view returns (uint256) {
        uint256 balance = _account.balance;
        return balance;
    }
}
