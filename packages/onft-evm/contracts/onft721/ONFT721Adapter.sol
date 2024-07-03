// SPDX-License-Identifier: MIT

pragma solidity ^0.8.22;

import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import { ONFT721Core } from "./ONFT721Core.sol";

/**
 * @title ONFT721Adapter Contract
 * @dev ONFT721Adapter is a wrapper used to enable cross-chain transferring of an existing ERC721 token.
 */
abstract contract ONFT721Adapter is ONFT721Core {
    IERC721 internal immutable innerToken;

    /**
     * @dev Constructor for the ONFT721 contract.
     * @param _token The underlying ERC721 token address this adapts
     * @param _lzEndpoint The LayerZero endpoint address.
     * @param _delegate The delegate capable of making OApp configurations inside of the endpoint.
     */
    constructor(address _token, address _lzEndpoint, address _delegate) ONFT721Core(_lzEndpoint, _delegate) {
        innerToken = IERC721(_token);
    }

    /**
     * @notice Retrieves the address of the underlying ERC721 implementation (ie. external contract).
     */
    function token() external view returns (address) {
        return address(innerToken);
    }

    /**
     * @notice Indicates whether the ONFT721 contract requires approval of the 'token()' to send.
     * @dev In the case of ONFT where the contract IS the token, approval is NOT required.
     * @return requiresApproval Needs approval of the underlying token implementation.
     */
    function approvalRequired() external pure virtual returns (bool) {
        return true;
    }

    function _debit(address _from, uint256 _tokenId, uint32 /*_dstEid*/) internal virtual override {
        // @dev Dont need to check onERC721Received() when moving into this contract, ie. no 'safeTransferFrom' required
        innerToken.transferFrom(_from, address(this), _tokenId);
    }

    function _credit(address _toAddress, uint256 _tokenId, uint32 /*_srcEid*/) internal virtual override {
        // @dev Do not need to check onERC721Received() when moving out of this contract, ie. no 'safeTransferFrom'
        // required
        // @dev The default implementation does not implement IERC721Receiver as 'safeTransferFrom' is not used.
        // @dev If IERC721Receiver is required, ensure proper re-entrancy protection is implemented.
        innerToken.transferFrom(address(this), _toAddress, _tokenId);
    }
}
