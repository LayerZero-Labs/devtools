// SPDX-LICENSE-IDENTIFIER: MIT

pragma solidity ^0.8.20;

import { IERC20, SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { OFTAdapter } from "./OFTAdapter.sol";
import { Fee } from "./Fee.sol";

abstract contract OFTFeeAdapter is OFTAdapter, Fee {
    using SafeERC20 for IERC20;

    uint256 public feeBalance;

    error NoFeesToWithdraw();
    event FeeWithdrawn(address indexed to, uint256 amountLD);

    constructor(
        address _token,
        address _lzEndpoint,
        address _owner
    ) OFTAdapter(_token, _lzEndpoint, _owner) {}

    // @dev Fees accumulate inside of the contract to save gas, and then can be withdrawn by the owner.
    function withdrawFees(address _to) external onlyOwner {
        // @dev doesn't allow owner to pull from the locked assets of the contract,
        // only from accumulated fees
        uint256 balance = feeBalance;
        if (balance == 0) revert NoFeesToWithdraw();

        feeBalance = 0;
        innerToken.safeTransferFrom(address(this), _to, balance);
        emit FeeWithdrawn(_to, balance);
    }

    function _debitView(
        uint256 _amountLD,
        uint256 _minAmountLD,
        uint32 _dstEid
    ) internal view virtual override returns (uint256 amountSentLD, uint256 amountReceivedLD) {
        amountSentLD = _amountLD;

        // @dev Apply the fee, then de-dust the amount afterwards.
        // This means the fee is taken from the amount before the dust is removed.
        uint256 fee = getFee(_dstEid, _amountLD);
        amountReceivedLD = _removeDust(_amountLD - fee);

        // @dev Check for slippage.
        if (amountReceivedLD < _minAmountLD) {
            revert SlippageExceeded(amountReceivedLD, _minAmountLD);
        }
    }

    function _debit(
        address _from,
        uint256 _amountLD,
        uint256 _minAmountLD,
        uint32 _dstEid
    ) internal virtual override returns (uint256 amountSentLD, uint256 amountReceivedLD) {
        (amountSentLD, amountReceivedLD) = _debitView(_amountLD, _minAmountLD, _dstEid);
        innerToken.safeTransferFrom(_from, address(this), amountSentLD);

        if (amountSentLD > amountReceivedLD) {
            // @dev increment the total fees that can be withdrawn
            feeBalance += (amountSentLD - amountReceivedLD);
        }
    }
}
