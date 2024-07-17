// SPDX-LICENSE-IDENTIFIER: MIT

pragma solidity ^0.8.20;

import { IERC20, SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { OFTAdapter } from "./OFTAdapter.sol";
import { Fee } from "./Fee.sol";

abstract contract OFTFeeAdapter is OFTAdapter, Fee {
    using SafeERC20 for IERC20;

    uint256 public feeBalance;

    constructor(address _token, address _lzEndpoint, address _delegate) OFTAdapter(_token, _lzEndpoint, _delegate) {}

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
     */
    function _debit(
        address _from,
        uint256 _amountLD,
        uint256 _minAmountLD,
        uint32 _dstEid
    ) internal virtual override returns (uint256 amountSentLD, uint256 amountReceivedLD) {
        (amountSentLD, amountReceivedLD) = _debitView(_amountLD, _minAmountLD, _dstEid);
        innerToken.safeTransferFrom(_from, address(this), amountSentLD);
        feeBalance += (amountSentLD - amountReceivedLD);
    }

    function _debitView(
        uint256 _amountLD,
        uint256 _minAmountLD,
        uint32 _dstEid
    ) internal view virtual override returns (uint256 amountSentLD, uint256 amountReceivedLD) {
        uint16 feeBps = _getFeeBps(_dstEid);
        // @dev Calculate the amount to be received on the remote chain after applying fees and removing dust.
        amountReceivedLD = _removeDust((_amountLD * (BPS_DENOMINATOR - feeBps)) / BPS_DENOMINATOR);
        if (amountReceivedLD < _minAmountLD) {
            revert SlippageExceeded(amountReceivedLD, _minAmountLD);
        }
        amountSentLD = (amountReceivedLD * BPS_DENOMINATOR) / (BPS_DENOMINATOR - feeBps);
    }

    function withdrawFees(address _to) external virtual onlyOwner {
        uint256 balance = feeBalance;
        feeBalance = 0;
        if (balance > 0) {
            _transferFrom(address(this), _to, balance);
        }
    }

    function _transferFrom(address _from, address _to, uint256 _amount) internal virtual returns (uint256) {
        uint256 before = innerToken.balanceOf(_to);
        if (_from == address(this)) {
            innerToken.safeTransfer(_to, _amount);
        } else {
            innerToken.safeTransferFrom(_from, _to, _amount);
        }
        return innerToken.balanceOf(_to) - before;
    }
}
