// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { TIP20OFT } from "../../contracts/OFTTIP20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TIP20OFTMock
 * @notice Concrete TIP20OFT for testing; exposes _debit and _credit.
 */
contract TIP20OFTMock is TIP20OFT {
    constructor(
        address _token,
        address _lzEndpoint,
        address _delegate
    ) TIP20OFT(_token, _lzEndpoint, _delegate) Ownable(_delegate) {}

    function debit(
        uint256 _amountToSendLD,
        uint256 _minAmountToCreditLD,
        uint32 _dstEid
    ) external returns (uint256 amountDebitedLD, uint256 amountToCreditLD) {
        return _debit(msg.sender, _amountToSendLD, _minAmountToCreditLD, _dstEid);
    }

    function credit(address _to, uint256 _amountToCreditLD, uint32 _srcEid) external returns (uint256 amountReceivedLD) {
        return _credit(_to, _amountToCreditLD, _srcEid);
    }
}
