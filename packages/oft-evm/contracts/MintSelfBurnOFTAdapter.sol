// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { OFTAdapter } from "./OFTAdapter.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IMintSelfBurnToken } from "./interfaces/IMintSelfBurnToken.sol";

contract MintSelfBurnOFTAdapter is OFTAdapter {
    constructor(
        address _token,
        address _lzEndpoint,
        address _delegate
    ) OFTAdapter(_token, _lzEndpoint, _delegate) Ownable(msg.sender) {}

    function _debit(
        address _from,
        uint256 _amountLD,
        uint256 _minAmountLD,
        uint32 _dstEid
    ) internal override returns (uint256 amountSentLD, uint256 amountReceivedLD) {
        (amountSentLD, amountReceivedLD) = super._debitView(_amountLD, _minAmountLD, _dstEid);

        IERC20(address(innerToken)).transferFrom(_from, address(this), amountSentLD);

        IMintSelfBurnToken(address(innerToken)).burn(amountSentLD);
    }

    function _credit(
        address _to,
        uint256 _amountLD,
        uint32 /* _srcEid */
    ) internal override returns (uint256 amountReceivedLD) {
        if (_to == address(0)) _to = address(0xdead);
        IMintSelfBurnToken(address(innerToken)).mint(_to, _amountLD);
        return _amountLD;
    }
}
