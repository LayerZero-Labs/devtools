// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

// External imports
import { IERC20, IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { DoubleSidedRateLimiter } from "@layerzerolabs/oapp-evm/contracts/oapp/utils/DoubleSidedRateLimiter.sol";

// Local imports
import { IMintableBurnableVoidReturn } from "./interfaces/IMintableBurnableVoidReturn.sol";
import { OFTCore } from "./OFTCore.sol";

/**
 * @title MABA_RL_OFT_AllowanceBurn
 * Full name: Mint And Burn OFT Adapter With Burn From Allowance And Double Sided Rate Limiter
 * @notice A variant of the standard OFT Adapter that uses an existing ERC20's mint and burn mechanisms for cross-chain transfers.
 * @dev This contract needs mint permissions on the token.
 * @dev This contract burns the tokens using allowance from the sender.
 * 
 * @dev This contract extends the DoubleSidedRateLimiter contract to provide double-sided rate limiting functionality.
 * @dev It allows for the configuration of rate limits for both outbound and inbound directions.
 * @dev It also allows for the setting of the rate limit accounting type to be net or gross.
 *
 * @dev Inherits from OFTCore and provides implementations for _debit and _credit functions using a mintable and burnable token.
 */
abstract contract MABA_RL_OFT_AllowanceBurn is OFTCore, DoubleSidedRateLimiter {
    /// @dev The underlying ERC20 token.
    IERC20 internal immutable innerToken;

    /**
     * @notice Initializes the MintBurnOFTAdapter contract.
     *
     * @param _token The address of the underlying ERC20 token.
     * @param _lzEndpoint The LayerZero endpoint address.
     * @param _delegate The address of the delegate.
     *
     * @dev Calls the OFTCore constructor with the token's decimals, the endpoint, and the delegate.
     */
    constructor(
        address _token,
        address _lzEndpoint,
        address _delegate
    ) OFTCore(IERC20Metadata(_token).decimals(), _lzEndpoint, _delegate) {
        innerToken = IERC20(_token);
    }

    /**
     * @notice Sets the cross-chain tx rate limits for specific endpoints based on provided configurations.
     * It allows configuration of rate limits either for outbound or inbound directions.
     * This method is designed to be called by contract admins for updating the system's rate limiting behavior.
     * 
     * @param _rateLimitConfigs An array of `RateLimitConfig` structs that specify the new rate limit settings.
     * Each struct includes an endpoint ID, the limit value, and the window duration.
     * @param _direction The direction (inbound or outbound) specifies whether the endpoint ID passed should be considered a srcEid or dstEid.
     * This parameter determines which set of rate limits (inbound or outbound) will be updated for each endpoint.
     */
    function setRateLimits(RateLimitConfig[] calldata _rateLimitConfigs, RateLimitDirection _direction) external onlyOwner {
        _setRateLimits(_rateLimitConfigs, _direction);
    }

    /**
     * @notice Resets the rate limits for the given endpoint ids.
     * @param _eids The endpoint ids to reset the rate limits for.
     * @param _direction The direction of the rate limits to reset.
     */
    function resetRateLimits(uint32[] calldata _eids, RateLimitDirection _direction) external onlyOwner {
        _resetRateLimits(_eids, _direction);
    }

    /**
     * @notice Sets the rate limit accounting type.
     * @dev You may want to call `resetRateLimits` after changing the rate limit accounting type.
     * @param _rateLimitAccountingType The new rate limit accounting type.
     */
    function setRateLimitAccountingType(RateLimitAccountingType _rateLimitAccountingType) external onlyOwner {
        _setRateLimitAccountingType(_rateLimitAccountingType);
    }

    /**
     * @notice Retrieves the address of the underlying ERC20 token.
     *
     * @return The address of the adapted ERC20 token.
     *
     * @dev In the case of MintBurnOFTAdapter, address(this) and erc20 are NOT the same contract.
     */
    function token() public view returns (address) {
        return address(innerToken);
    }

    /**
     * @notice Indicates whether the OFT contract requires approval of the underlying token to send.
     *
     * @return requiresApproval True if approval is required, false otherwise.
     *
     * @dev In this adapter, approval is REQUIRED because it uses allowance from the sender to burn.
     */
    function approvalRequired() external pure virtual returns (bool) {
        return true;
    }

    /**
     * @notice Burns tokens from the sender's balance to prepare for sending.
     *
     * @param _from The address to debit the tokens from.
     * @param _amountLD The amount of tokens to send in local decimals.
     * @param _minAmountLD The minimum amount to send in local decimals.
     * @param _dstEid The destination chain ID.
     *
     * @return amountSentLD The amount sent in local decimals.
     * @return amountReceivedLD The amount received in local decimals on the remote.
     *
     * @dev WARNING: The default OFTAdapter implementation assumes LOSSLESS transfers, i.e., 1 token in, 1 token out.
     *      If the 'innerToken' applies something like a transfer fee, the default will NOT work.
     *      A pre/post balance check will need to be done to calculate the amountReceivedLD.
     */
    function _debit(
        address _from,
        uint256 _amountLD,
        uint256 _minAmountLD,
        uint32 _dstEid
    ) internal virtual override returns (uint256 amountSentLD, uint256 amountReceivedLD) {
        (amountSentLD, amountReceivedLD) = _debitView(_amountLD, _minAmountLD, _dstEid);
        _checkAndUpdateRateLimit(_dstEid, amountSentLD, RateLimitDirection.Outbound);

        // Burns tokens from the caller.
        IMintableBurnableVoidReturn(address(innerToken)).burn(_from, amountSentLD);
    }

    /**
     * @notice Mints tokens to the specified address upon receiving them.
     *
     * @param _to The address to credit the tokens to.
     * @param _amountLD The amount of tokens to credit in local decimals.
     *
     * @return amountReceivedLD The amount of tokens actually received in local decimals.
     *
     * @dev WARNING: The default OFTAdapter implementation assumes LOSSLESS transfers, i.e., 1 token in, 1 token out.
     *      If the 'innerToken' applies something like a transfer fee, the default will NOT work.
     *      A pre/post balance check will need to be done to calculate the amountReceivedLD.
     */
    function _credit(
        address _to,
        uint256 _amountLD,
        uint32 _srcEid
    ) internal virtual override returns (uint256 amountReceivedLD) {
        if (_to == address(0x0)) _to = address(0xdead); // _mint(...) does not support address(0x0)

        // Check and update the rate limit based on the source endpoint ID (srcEid) and the amount in local decimals from the message.
        _checkAndUpdateRateLimit(_srcEid, _amountLD, RateLimitDirection.Inbound);

        // Mints the tokens and transfers to the recipient.
        IMintableBurnableVoidReturn(address(innerToken)).mint(_to, _amountLD);
        
        // In the case of NON-default OFTAdapter, the amountLD MIGHT not be equal to amountReceivedLD.
        return _amountLD;
    }
}
