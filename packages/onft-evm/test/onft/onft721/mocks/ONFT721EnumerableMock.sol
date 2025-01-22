// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { ONFT721Enumerable } from "../../../../contracts/onft721/ONFT721Enumerable.sol";
import { SendParam } from "../../../../contracts/onft721/ONFT721Core.sol";

contract ONFT721EnumerableMock is ONFT721Enumerable {
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) ONFT721Enumerable(_name, _symbol, _lzEndpoint, _delegate) {}

    function mint(address _to, uint256 _tokenId) public {
        _mint(_to, _tokenId);
    }

    function debit(uint256 _tokenId, uint32 _dstEid) public {
        _debit(msg.sender, _tokenId, _dstEid);
    }

    function exists(uint256 _tokenId) public view returns (bool) {
        return _ownerOf(_tokenId) != address(0);
    }

    function credit(address _toAddress, uint256 _tokenId, uint32 _srcEid) public {
        _credit(_toAddress, _tokenId, _srcEid);
    }

    function buildMsgAndOptions(SendParam calldata _sendParam) public view returns (bytes memory, bytes memory) {
        return _buildMsgAndOptions(_sendParam);
    }
}
