// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { ERC1155 } from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import { ONFT1155Core } from "./ONFT1155Core.sol";

abstract contract ONFT1155 is ERC1155, ONFT1155Core {
    constructor(
        string memory _uri,
        address _lzEndpoint,
        address _delegate
    ) ERC1155(_uri) ONFT1155Core(_lzEndpoint, _delegate) {}

    function _debit(
        uint256[] memory _tokenIds,
        uint256[] memory _amounts,
        uint32 /*_dstEid*/
    ) internal virtual override {
        if (!isApprovedForAll(msg.sender, address(this))) revert UnapprovedSender(msg.sender);
        _burnBatch(msg.sender, _tokenIds, _amounts);
    }

    function _credit(
        address _to,
        uint256[] memory _tokenIds,
        uint256[] memory _amounts,
        uint32 /*_srcEid*/
    ) internal virtual override {
        _mintBatch(_to, _tokenIds, _amounts, "");
    }

    function token() external view returns (address tokenAddress) {
        tokenAddress = address(this);
    }
}
