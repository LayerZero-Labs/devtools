// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

// External imports
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20, IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

// Local imports
import { OFTCore } from "./OFTCore.sol";
import { IEndpointV2Alt } from "./interfaces/IEndpointV2Alt.sol";
import { ITIP20Minter } from "./interfaces/ITIP20Minter.sol";

/**
 * @title TIP20OFT
 * @notice A variant of the standard OFT that uses TIP20 token's mint and burn mechanisms for cross-chain transfers.
 *
 * @dev Inherits from OFTCore and provides implementations for _debit and _credit functions using TIP20 token's mint and burn mechanisms.
 */
abstract contract TIP20OFT is OFTCore {
    using SafeERC20 for IERC20;
    /// @dev The underlying ERC20 token.
    address internal immutable innerToken;
    address internal immutable nativeToken;

    /// @dev Reverted when the endpoint has no native token (e.g. not an EndpointV2Alt).
    error NativeTokenUnavailable();

    constructor(
        address _token,
        address _lzEndpoint,
        address _delegate
    ) OFTCore(IERC20Metadata(_token).decimals(), _lzEndpoint, _delegate) {
        innerToken = _token;
        nativeToken = IEndpointV2Alt(_lzEndpoint).nativeToken();
    }

    function token() public view returns (address) {
        return address(innerToken);
    }

    /**
     * @dev a transfer is needed so the user needs to approve the tokens first
     */
    function approvalRequired() external pure virtual returns (bool) {
        return true;
    }

    /**
     * @dev override needed because TIP20 do not support burning from the user's balance
     */
    function _debit(
        address _from,
        uint256 _amountLD,
        uint256 _minAmountLD,
        uint32 _dstEid
    ) internal virtual override returns (uint256 amountSentLD, uint256 amountReceivedLD) {
        (amountSentLD, amountReceivedLD) = _debitView(_amountLD, _minAmountLD, _dstEid);
        // Transfer + burn the tokens from the user (instead of burning from the user's balance)
        IERC20(innerToken).safeTransferFrom(_from, address(this), amountSentLD);
        ITIP20Minter(innerToken).burn(amountSentLD);
    }

    function _credit(
        address _to,
        uint256 _amountLD,
        uint32 /* _srcEid */
    ) internal virtual override returns (uint256 amountReceivedLD) {
        if (_to == address(0x0)) _to = address(0xdead); // _mint(...) does not support address(0x0)
        // Mints the tokens to the recipient
        ITIP20Minter(innerToken).mint(_to, _amountLD);
        return _amountLD;
    }

    /**
     * @dev override needed to support Alt endpoints.
     *      Pays the fee in the native ERC20 token (transfer to endpoint); returns 0 so that
     *      the OApp does not forward any msg.value to the endpoint (Alt rejects msg.value).
     */
    function _payNative(uint256 _nativeFee) internal override returns (uint256 nativeFee) {
        if (nativeToken == address(0)) revert NativeTokenUnavailable();

        // Pay native token fee by sending tokens to the endpoint.
        IERC20(nativeToken).safeTransferFrom(msg.sender, address(endpoint), _nativeFee);

        // Return 0 so endpoint.send{ value: 0 } is used (Alt endpoint rejects msg.value).
        return 0;
    }
}
