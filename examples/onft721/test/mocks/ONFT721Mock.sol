// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import { ONFT721 } from "@layerzerolabs/onft-evm/contracts/onft721/ONFT721.sol";
import { SendParam } from "@layerzerolabs/onft-evm/contracts/onft721/interfaces/IONFT721.sol";

contract ONFT721Mock is ONFT721 {
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) ONFT721(_name, _symbol, _lzEndpoint, _delegate) {}

    function mint(address _to, uint256 _tokenId) public {
        _mint(_to, _tokenId);
    }

    // @dev expose internal functions for testing purposes
    function debit(uint256 _tokenId, uint32 _dstEid) public {
        _debit(msg.sender, _tokenId, _dstEid);
    }

    function credit(address _to, uint256 _tokenId, uint32 _srcEid) public {
        _credit(_to, _tokenId, _srcEid);
    }

    function buildMsgAndOptions(
        SendParam calldata _sendParam
    ) public view returns (bytes memory message, bytes memory options) {
        return _buildMsgAndOptions(_sendParam);
    }
}
