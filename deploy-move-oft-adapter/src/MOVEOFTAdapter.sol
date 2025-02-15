// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {OFTAdapter} from "layerzerolabs/oapp/contracts/oft/OFTAdapter.sol";
import {RateLimiter} from "layerzerolabs/oapp/contracts/oapp/utils/RateLimiter.sol";

contract MOVEOFTAdapter is OFTAdapter, RateLimiter {
    constructor(address _token, address _lzEndpoint, address _delegate, RateLimiter.RateLimitConfig[] memory _rateLimitConfig)
        OFTAdapter(_token, _lzEndpoint, _delegate)
        Ownable(_delegate)
    {
        _setRateLimits(_rateLimitConfig);
    }

    /**
     * @dev Returns the number of shared decimals for the OFTAdapter.
     */
    function sharedDecimals() public view override returns (uint8) {
        return 8;
    }

    /**
     * @dev Sets the rate limits for the OFTAdapter.
     * @param _rateLimitConfigs The rate limit configurations to set.
     */
    function setRateLimits(RateLimitConfig[] calldata _rateLimitConfigs) external onlyOwner {
        _setRateLimits(_rateLimitConfigs);
    }

    /**
     * @dev Internal function to mock the amount mutation from a OFT debit() operation.
     * @param _amountLD The amount to send in local decimals.
     * @param _minAmountLD The minimum amount to send in local decimals.
     * @dev _dstEid The destination endpoint ID.
     * @return amountSentLD The amount sent, in local decimals.
     * @return amountReceivedLD The amount to be received on the remote chain, in local decimals.
     *
     * @dev This is where things like fees would be calculated and deducted from the amount to be received on the remote.
     */
    function _debit(address _from, uint256 _amountLD, uint256 _minAmountLD, uint32 _dstEid)
        internal
        virtual
        override
        returns (uint256 amountSentLD, uint256 amountReceivedLD)
    {
        _checkAndUpdateRateLimit(2, _amountLD);
        return super._debit(_from, _amountLD, _minAmountLD, _dstEid);
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
    function _credit(address _to, uint256 _amountLD, uint32 _srcEid)
        internal
        virtual
        override
        returns (uint256 amountReceivedLD)
    {
        _checkAndUpdateRateLimit(1, _amountLD);
        return super._credit(_to, _amountLD, _srcEid);
    }
}
