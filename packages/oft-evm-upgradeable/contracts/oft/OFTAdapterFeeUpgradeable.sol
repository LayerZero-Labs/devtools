// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import { IERC20Metadata, IERC20 } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IOFT, OFTCoreUpgradeable } from "./OFTCoreUpgradeable.sol";
import { FeeUpgradeable } from "./FeeUpgradeable.sol";
import { OFTAdapterUpgradeable } from "./OFTAdapterUpgradeable.sol";

/**
 * @title OFTAdapterFeeUpgradeable Contract
 * @dev OFTAdapter is a contract that adapts an ERC-20 token to the OFT functionality.
 *
 * @dev For existing ERC20 tokens, this can be used to convert the token to crosschain compatibility.
 * @dev WARNING: ONLY 1 of these should exist for a given global mesh,
 * unless you make a NON-default implementation of OFT and needs to be done very carefully.
 * @dev WARNING: The default OFTAdapter implementation assumes LOSSLESS transfers, ie. 1 token in, 1 token out.
 * IF the 'innerToken' applies something like a transfer fee, the default will NOT work...
 * a pre/post balance check will need to be done to calculate the amountSentLD/amountReceivedLD.
 */
abstract contract OFTAdapterFeeUpgradeable is OFTAdapterUpgradeable, FeeUpgradeable {
    using SafeERC20 for IERC20;

    struct OFTAdapterFeeStorage {
        uint256 feeBalance;
    }

    // keccak256(abi.encode(uint256(keccak256("layerzerov2.storage.oftadapterfee")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant OFT_ADAPTER_FEE_STORAGE_LOCATION =
        0xfa59b1dc51c6c32c20175ee9f2a15c109f5bc283585a682571fcd93bfcfd4d00; //@TODO: calculate and update

    function _getOFTAdapterFeeStorage() internal pure returns (OFTAdapterFeeStorage storage $) {
        assembly {
            $.slot := OFT_ADAPTER_FEE_STORAGE_LOCATION
        }
    }

    function feeBalance() public view returns (uint256) {
        OFTAdapterFeeStorage storage $ = _getOFTAdapterFeeStorage();
        return $.feeBalance;
    }

    event FeeWithdrawn(address indexed to, uint256 amountLD);
    
    error NoFeesToWithdraw();

    /**
     * @dev Constructor for initializing the contract with token and endpoint addresses.
     * @param _token The address of the token.
     * @param _lzEndpoint The address of the LayerZero endpoint.
     * @dev _token must implement the IERC20 interface, and include a decimals() function.
     */
    constructor(address _token, address _lzEndpoint) OFTAdapterUpgradeable(_token, _lzEndpoint) {}

    /**
     * @dev Initializes the OFTAdapter with the provided delegate.
     * @param _delegate The delegate capable of making OApp configurations inside of the endpoint.
     *
     * @dev The delegate typically should be set as the owner of the contract.
     * @dev Ownable is not initialized here on purpose. It should be initialized in the child contract to
     * accommodate the different version of Ownable.
     */
    function __OFTAdapterFee_init(address _delegate) internal onlyInitializing {
        __OFTAdapter_init(_delegate);
        __Fee_init();
    }

    function __OFTAdapterFee_init_unchained() internal onlyInitializing {}

    /**
     * @notice Withdraws accumulated fees to a specified address.
     * @param _to The address to which the fees will be withdrawn.
     */
    function withdrawFees(address _to) external onlyOwner {
        // @dev doesn't allow owner to pull from the locked assets of the contract,
        // only from accumulated fees
        OFTAdapterFeeStorage storage $ = _getOFTAdapterFeeStorage();
        uint256 balance = $.feeBalance;
        if (balance == 0) revert NoFeesToWithdraw();

        $.feeBalance = 0;
        innerToken.safeTransfer(_to, balance);
        emit FeeWithdrawn(_to, balance);
    }

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
     * @dev Transfers the full amount from the sender's balance to the contract,
     *      then burns the amount minus the fee from the contract leaving the fee locked in the contract.
     * @param _from The address to debit from.
     * @param _amountLD The amount of tokens to send in local decimals.
     * @param _minAmountLD The minimum amount to send in local decimals.
     * @param _dstEid The destination chain ID.
     * @return amountSentLD The amount sent in local decimals.
     * @return amountReceivedLD The amount received in local decimals on the remote.
     */
    function _debit(
        address _from,
        uint256 _amountLD,
        uint256 _minAmountLD,
        uint32 _dstEid
    ) internal virtual override returns (uint256 amountSentLD, uint256 amountReceivedLD) {
        (amountSentLD, amountReceivedLD) = _debitView(_amountLD, _minAmountLD, _dstEid);

        // @dev Lock tokens by moving them into this contract from the caller.
        innerToken.safeTransferFrom(_from, address(this), amountSentLD);

        if (amountSentLD > amountReceivedLD) {
            // @dev Increment the total fees that can be withdrawn.
            //      Fees include the dust resulting from the de-dust operation.
            OFTAdapterFeeStorage storage $ = _getOFTAdapterFeeStorage();
            unchecked {
                $.feeBalance += (amountSentLD - amountReceivedLD);
            }
        }
    }

    /**
     * @dev Credits tokens to the specified address.
     * @param _to The address to credit the tokens to.
     * @param _amountLD The amount of tokens to credit in local decimals.
     * @dev _srcEid The source chain ID.
     * @return amountReceivedLD The amount of tokens ACTUALLY received in local decimals.
     */
    function _credit(
        address _to,
        uint256 _amountLD,
        uint32 _srcEid
    ) internal virtual override returns (uint256 amountReceivedLD) {
        if (_to == address(0x0)) _to = address(0xdead);

        // @dev Unlock the tokens and transfer to the recipient.
        innerToken.safeTransfer(_to, _amountLD);
        // @dev In the case of NON-default OFTAdapter, the amountLD MIGHT not be == amountReceivedLD.
        return _amountLD;
    }
}
