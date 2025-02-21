// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import { FeeUpgradeable } from "./FeeUpgradeable.sol";
import { OFTUpgradeable } from "./OFTUpgradeable.sol";

/**
 * @title OFTFeeUpgradeable Contract
 * @notice Upgradeable OFT with fees.
 */
abstract contract OFTFeeUpgradeable is OFTUpgradeable, FeeUpgradeable {
    struct OFTFeeStorage {
        uint256 feeBalance;
    }

    // keccak256(abi.encode(uint256(keccak256("layerzerov2.storage.oftfee")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant OFT_FEE_STORAGE_LOCATION =
        0x68f1d0d99488c60d21eadee2cca13b58661d56fbcb4e4464d6fc8def1b342200;

    function _getOFTFeeStorage() internal pure returns (OFTFeeStorage storage $) {
        assembly {
            $.slot := OFT_FEE_STORAGE_LOCATION
        }
    }

    function feeBalance() public view returns (uint256) {
        OFTFeeStorage storage $ = _getOFTFeeStorage();
        return $.feeBalance;
    }

    event FeeWithdrawn(address indexed to, uint256 amountLD);

    error NoFeesToWithdraw();

    /**
     * @dev Constructor for initializing the contract with LayerZero endpoint address.
     * @param _lzEndpoint The address of the LayerZero endpoint.
     */
    constructor(address _lzEndpoint) OFTUpgradeable(_lzEndpoint) {}

    /**
     * @dev Initializes the OFTFeeUpgradeable contract.
     * @param _name The name of the OFT.
     * @param _symbol The symbol of the OFT.
     * @param _delegate The address of the LayerZero delegate.
     */
    function __OFTFee_init(
        string memory _name,
        string memory _symbol,
        address _delegate
    ) internal onlyInitializing {
        __OFT_init(_name, _symbol, _delegate);
        __Fee_init();
    }

    /**
     * @dev Unchained initialization function for the contract.
     */
    function __OFTFee_init_unchained() internal onlyInitializing {}

    /**
     * @dev Calculates the amount to be sent and received after applying fees and checking for slippage.
     * @param _amountLD The amount of tokens to send in local decimals.
     * @param _minAmountLD The minimum amount to send in local decimals.
     * @param _dstEid The destination chain ID.
     * @return amountSentLD The amount sent in local decimals.
     * @return amountReceivedLD The amount received in local decimals on the remote.
     */
    function _debitView(
        uint256 _amountLD,
        uint256 _minAmountLD,
        uint32 _dstEid
    ) internal view virtual override returns (uint256 amountSentLD, uint256 amountReceivedLD) {
        amountSentLD = _amountLD;

        // @dev Apply the fee, then de-dust the amount afterwards.
        // This means the fee is taken from the amount before the dust is removed.
        uint256 fee = getFee(_dstEid, _amountLD);
        unchecked {
            amountReceivedLD = _removeDust(_amountLD - fee);
        }

        // @dev Check for slippage.
        if (amountReceivedLD < _minAmountLD) {
            revert SlippageExceeded(amountReceivedLD, _minAmountLD);
        }
    }

    /**
     * @dev Debits the sender's account for the full amount with fees and burns amount minus fees.
     * @param _from The address of the sender.
     * @param _amountLD The amount of tokens to send in local decimals.
     * @param _minAmountLD The minimum amount to send in local decimals.
     * @param _dstEid The destination chain endpoint ID.
     * @return amountSentLD The amount sent in local decimals.
     * @return amountReceivedLD The amount received in local decimals on the destination chain.
     */
    function _debit(
        address _from,
        uint256 _amountLD,
        uint256 _minAmountLD,
        uint32 _dstEid
    ) internal virtual override returns (uint256 amountSentLD, uint256 amountReceivedLD) {
        (amountSentLD, amountReceivedLD) = _debitView(_amountLD, _minAmountLD, _dstEid);
        uint256 fee = amountSentLD - amountReceivedLD;
        if (fee > 0) {
            // @dev Increment the total fees that can be withdrawn.
            //      Fees include the dust resulting from the de-dust operation.
            OFTFeeStorage storage $ = _getOFTFeeStorage();
            $.feeBalance += fee;
            _transfer(_from, address(this), fee);
        }
        _burn(_from, amountReceivedLD);
    }

    /**
     * @notice Withdraws accumulated fees to a specified address.
     * @param _to The address to which the fees will be withdrawn.
     */
    function withdrawFees(address _to) external onlyOwner {
        OFTFeeStorage storage $ = _getOFTFeeStorage();
        uint256 balance = $.feeBalance;
        if (balance == 0) revert NoFeesToWithdraw();

        $.feeBalance = 0;
        _transfer(address(this), _to, balance);
        emit FeeWithdrawn(_to, balance);
    }
}