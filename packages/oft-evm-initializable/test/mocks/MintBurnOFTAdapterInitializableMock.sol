// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { MintBurnOFTAdapterInitializable } from "../../contracts/MintBurnOFTAdapterInitializable.sol";
import { IMintableBurnable } from "../../contracts/interfaces/IMintableBurnable.sol";

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

// @dev WARNING: This is for testing purposes only
contract MintBurnOFTAdapterInitializableMock is MintBurnOFTAdapterInitializable {
    constructor(
        address _token,
        IMintableBurnable _minterBurner,
        address _lzEndpoint,
        address _delegate
    ) MintBurnOFTAdapterInitializable(_token, _minterBurner, _lzEndpoint, _delegate) Ownable(_delegate) {}

    // @dev expose internal functions for testing purposes
    function debit(
        uint256 _amountToSendLD,
        uint256 _minAmountToCreditLD,
        uint32 _dstEid
    ) public returns (uint256 amountDebitedLD, uint256 amountToCreditLD) {
        return _debit(msg.sender, _amountToSendLD, _minAmountToCreditLD, _dstEid);
    }

    function credit(address _to, uint256 _amountToCreditLD, uint32 _srcEid) public returns (uint256 amountReceivedLD) {
        return _credit(_to, _amountToCreditLD, _srcEid);
    }
}