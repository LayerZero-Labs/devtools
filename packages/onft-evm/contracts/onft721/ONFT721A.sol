// SPDX-License-Identifier: MIT

pragma solidity ^0.8.22;

import { ERC721A, ERC721A__IERC721Receiver } from "erc721a/contracts/ERC721A.sol";
import { ONFT721Core } from "./ONFT721Core.sol";

// TODO: DO NOT MERGE:  this is still up in the air as improvements to ERC721A happen upstream
abstract contract ONFT721A is ONFT721Core, ERC721A, ERC721A__IERC721Receiver {
    /**
     * @dev Constructor for the ONFT721 contract.
     * @param _name The name of the ONFT.
     * @param _symbol The symbol of the ONFT.
     * @param _lzEndpoint The LayerZero endpoint address.
     * @param _delegate The delegate capable of making OApp configurations inside of the endpoint.
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) ERC721A(_name, _symbol) ONFT721Core(_lzEndpoint, _delegate) {}

    function _debit(
        uint256 _tokenId,
        uint32 /*_dstEid*/ // Exposed to future-proof overriding.
    ) internal virtual override {
        // TODO: Think more about this.  With updates now, we can mint a spot (specific) id, but only in a certain range.
        // Thus, we may still need to use safeTransferFrom()
        safeTransferFrom(msg.sender, address(this), _tokenId);
    }

    function _credit(
        address _to,
        uint256 _tokenId,
        uint32 /*_srcEid*/ // Exposed to future-proof overriding.
    ) internal virtual override {
        // TODO use custom error here.
        if (!_exists(_tokenId) || ERC721A.ownerOf(_tokenId) != address(this)) revert("unowned");
        safeTransferFrom(address(this), _to, _tokenId);
    }

    function onERC721Received(address, address, uint, bytes memory) public virtual override returns (bytes4) {
        return ERC721A__IERC721Receiver.onERC721Received.selector;
    }
}
