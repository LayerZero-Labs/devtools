// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

// External imports
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20, IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

// Local imports
import { OFTAltCore } from "./OFTAltCore.sol";
import { ITIP20Minter } from "./interfaces/ITIP20Minter.sol";

/**
 * @title TIP20OFT
 * @notice A variant of the standard OFT that uses TIP20 token's mint and burn mechanisms for cross-chain transfers.
 *
 * @dev Inherits from OFTAltCore and provides implementations for _debit and _credit using TIP20 token's mint and burn.
 *      Native fee payment is already handled by OAppSenderAlt (pay in ERC20 native token); no msg.value.
 */
abstract contract TIP20OFT is OFTAltCore {
    using SafeERC20 for IERC20;

    /// @dev The underlying ERC20 token.
    address internal immutable innerToken;

    constructor(
        address _token,
        address _lzEndpoint,
        address _delegate
    ) OFTAltCore(IERC20Metadata(_token).decimals(), _lzEndpoint, _delegate) {
        innerToken = _token;
    }

    function token() public view returns (address) {
        return address(innerToken);
    }

    /**
     * @dev A transfer is needed so the user needs to approve the tokens first.
     */
    function approvalRequired() external pure virtual returns (bool) {
        return true;
    }

    /**
     * @dev Override needed because TIP20 does not support burning from the user's balance.
     */
    function _debit(
        address _from,
        uint256 _amountLD,
        uint256 _minAmountLD,
        uint32 _dstEid
    ) internal virtual override returns (uint256 amountSentLD, uint256 amountReceivedLD) {
        (amountSentLD, amountReceivedLD) = _debitView(_amountLD, _minAmountLD, _dstEid);
        // Transfer + burn the tokens from the user (instead of burning from the user's balance).
        IERC20(innerToken).safeTransferFrom(_from, address(this), amountSentLD);
        ITIP20Minter(innerToken).burn(amountSentLD);
    }

    function _credit(
        address _to,
        uint256 _amountLD,
        uint32 /* _srcEid */
    ) internal virtual override returns (uint256 amountReceivedLD) {
        if (_to == address(0x0)) _to = address(0xdead); // _mint(...) does not support address(0x0)
        ITIP20Minter(innerToken).mint(_to, _amountLD);
        return _amountLD;
    }
}
