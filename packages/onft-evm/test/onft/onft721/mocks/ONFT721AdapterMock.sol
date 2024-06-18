// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { ONFT721Adapter } from "../../../../contracts/onft721/ONFT721Adapter.sol";

contract ONFT721AdapterMock is ONFT721Adapter {
    constructor(
        address _token,
        address _lzEndpoint,
        address _delegate
    ) ONFT721Adapter(_token, _lzEndpoint, _delegate) {}

    function debit(uint256 _tokenId, uint32 _dstEid) public {
        _debit(msg.sender, _tokenId, _dstEid);
    }

    function credit(address _to, uint256 _tokenId, uint32 _srcEid) public {
        _credit(_to, _tokenId, _srcEid);
    }
}
