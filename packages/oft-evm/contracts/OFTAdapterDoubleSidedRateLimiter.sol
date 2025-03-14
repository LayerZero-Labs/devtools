// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC20Metadata, IERC20 } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import { DoubleSidedRateLimiter } from "@layerzerolabs/oapp-evm/contracts/oapp/utils/DoubleSidedRateLimiter.sol";

import { OFTCore } from "./OFTCore.sol";

/**
 * @title OFTAdapterDoubleSidedRateLimiter Contract
 * @dev OFTAdapter is a contract that adapts an ERC-20 token to the OFT functionality.
 * @dev This contract extends the DoubleSidedRateLimiter contract to provide double-sided rate limiting functionality.
 * @dev It allows for the configuration of rate limits for both outbound and inbound directions.
 * @dev It also allows for the setting of the rate limit accounting type to be Net or Gross.
 *
 * @dev For existing ERC20 tokens, this can be used to convert the token to crosschain compatibility.
 * @dev WARNING: ONLY 1 of these should exist for a given global mesh,
 * unless you make a NON-default implementation of OFT and needs to be done very carefully.
 * @dev WARNING: The default OFTAdapter implementation assumes LOSSLESS transfers, ie. 1 token in, 1 token out.
 * IF the 'innerToken' applies something like a transfer fee, the default will NOT work...
 * a pre/post balance check will need to be done to calculate the amountSentLD/amountReceivedLD.
 */
abstract contract OFTAdapterDoubleSidedRateLimiter is OFTCore, DoubleSidedRateLimiter {
    using SafeERC20 for IERC20;

    IERC20 internal immutable innerToken;

     /**
     * @dev Constructor for the OFTAdapter contract.
     * @param _token The address of the ERC-20 token to be adapted.
     * @param _lzEndpoint The LayerZero endpoint address.
     * @param _delegate The delegate capable of making OApp configurations inside of the endpoint.
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
     * @param direction The direction (`Outbound` or `Inbound`) specifies whether the endpoint ID passed should be considered a dstEid or srcEid.
     * This parameter determines which set of rate limits (outbound or inbound) will be updated for each endpoint.
     */
    function setRateLimits(RateLimitConfig[] calldata _rateLimitConfigs, RateLimitDirection direction) external onlyOwner {
        _setRateLimits(_rateLimitConfigs, direction);
    }

    /**
     * @notice Resets the rate limits for the given endpoint ids.
     * @param _eids The endpoint ids to reset the rate limits for.
     * @param direction The direction of the rate limits to reset.
     */
    function resetRateLimits(uint32[] calldata _eids, RateLimitDirection direction) external onlyOwner {
        _resetRateLimits(_eids, direction);
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
     * @dev Retrieves the address of the underlying ERC20 implementation.
     * @return The address of the adapted ERC-20 token.
     *
     * @dev In the case of OFTAdapter, address(this) and erc20 are NOT the same contract.
     */
    function token() public view returns (address) {
        return address(innerToken);
    }

    /**
     * @notice Indicates whether the OFT contract requires approval of the 'token()' to send.
     * @return requiresApproval Needs approval of the underlying token implementation.
     *
     * @dev In the case of default OFTAdapter, approval is required.
     * @dev In non-default OFTAdapter contracts with something like mint and burn privileges, it would NOT need approval.
     */
    function approvalRequired() external pure virtual returns (bool) {
        return true;
    }

    /**
     * @dev Locks tokens from the sender's specified balance in this contract.
     * @param _from The address to debit from.
     * @param _amountLD The amount of tokens to send in local decimals.
     * @param _minAmountLD The minimum amount to send in local decimals.
     * @param _dstEid The destination chain ID.
     * @return amountSentLD The amount sent in local decimals.
     * @return amountReceivedLD The amount received in local decimals on the remote.
     *
     * @dev msg.sender will need to approve this _amountLD of tokens to be locked inside of the contract.
     * @dev WARNING: The default OFTAdapter implementation assumes LOSSLESS transfers, ie. 1 token in, 1 token out.
     * IF the 'innerToken' applies something like a transfer fee, the default will NOT work...
     * a pre/post balance check will need to be done to calculate the amountReceivedLD.
     */
    function _debit(
        address _from,
        uint256 _amountLD,
        uint256 _minAmountLD,
        uint32 _dstEid
    ) internal virtual override returns (uint256 amountSentLD, uint256 amountReceivedLD) {
        (amountSentLD, amountReceivedLD) = _debitView(_amountLD, _minAmountLD, _dstEid);
        _checkAndUpdateRateLimit(_dstEid, amountSentLD, RateLimitDirection.Outbound);

        // @dev Lock tokens by moving them into this contract from the caller.
        innerToken.safeTransferFrom(_from, address(this), amountSentLD);
    }

    /**
     * @dev Credits tokens to the specified address.
     * @param _to The address to credit the tokens to.
     * @param _amountLD The amount of tokens to credit in local decimals.
     * @dev _srcEid The source chain ID.
     * @return amountReceivedLD The amount of tokens ACTUALLY received in local decimals.
     *
     * @dev WARNING: The default OFTAdapter implementation assumes LOSSLESS transfers, ie. 1 token in, 1 token out.
     * IF the 'innerToken' applies something like a transfer fee, the default will NOT work...
     * a pre/post balance check will need to be done to calculate the amountReceivedLD.
     */
    function _credit(
        address _to,
        uint256 _amountLD,
        uint32 _srcEid
    ) internal virtual override returns (uint256 amountReceivedLD) {
        // Check and update the rate limit based on the source endpoint ID (srcEid) and the amount in local decimals from the message.
        _checkAndUpdateRateLimit(_srcEid, _amountLD, RateLimitDirection.Inbound);
        
        // @dev Unlock the tokens and transfer to the recipient.
        innerToken.safeTransfer(_to, _amountLD);

        // @dev In the case of NON-default OFT, the _amountLD MIGHT not be == amountReceivedLD.
        return _amountLD;
    }
}