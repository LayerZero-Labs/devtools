// SPDX-License-Identifier: MIT

pragma solidity >=0.8.0;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { IONFT721, ONFT721Core } from "./ONFT721Core.sol";

/// @title ONFT721 Contract
/// @dev ONFT721 is an ERC-721 token that extends the functionality of the ONFT721Core contract.
abstract contract ONFT721 is ONFT721Core, ERC721 {
    /// @dev Constructor for the ONFT721 contract.
    /// @param _name The name of the ONFT.
    /// @param _symbol The symbol of the ONFT.
    /// @param _lzEndpoint The LayerZero endpoint address.
    /// @param _delegate The delegate capable of making OApp configurations inside of the endpoint.
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) ERC721(_name, _symbol) ONFT721Core(_lzEndpoint, _delegate) {}

    /// @notice Retrieves the address of the underlying ERC721 implementation (this contract).
    function token() external view returns (address tokenAddress) {
        tokenAddress = address(this);
    }

    /// @notice Indicates whether the ONFT721 contract requires approval of the 'token()' to send.
    /// @dev In the case of ONFT where the contract IS the token, approval is NOT required.
    /// @return requiresApproval Needs approval of the underlying token implementation.
    function approvalRequired() external pure virtual returns (bool requiresApproval) {
        requiresApproval = false;
    }

    function _debit(
        uint256 _tokenId,
        uint32 /*_dstEid*/ // Exposed to future-proof overriding.
    ) internal virtual override {
        if (!_isOwnerOrApproved(msg.sender, _tokenId)) revert UnapprovedSender(msg.sender);
        _burn(_tokenId);
    }

    function _credit(
        address _to,
        uint256 _tokenId,
        uint32 /*_srcEid*/ // Exposed to future-proof overriding.
    ) internal virtual override {
        _mint(_to, _tokenId);
    }

    function _isOwnerOrApproved(address spender, uint256 tokenId) internal view virtual returns (bool) {
        address owner = ERC721.ownerOf(tokenId);
        return (spender == owner || isApprovedForAll(owner, spender) || getApproved(tokenId) == spender);
    }
}
