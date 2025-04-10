// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IOFT } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { HyperLiquidComposerCodec } from "./library/HyperLiquidComposerCodec.sol";
import { IHyperLiquidComposerErrors, ErrorMessagePayload } from "./interfaces/IHyperLiquidComposerErrors.sol";
import { IHyperLiquidWritePrecompile } from "./interfaces/IHyperLiquidWritePrecompile.sol";
import { IHyperLiquidReadPrecompile } from "./interfaces/IHyperLiquidReadPrecompile.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import { IHyperLiquidComposerCore, IHyperAsset, IHyperAssetAmount } from "./interfaces/IHyperLiquidComposerCore.sol";

contract HyperLiquidComposerCore is IHyperLiquidComposerCore {
    using SafeERC20 for IERC20;

    using HyperLiquidComposerCodec for bytes32;
    using HyperLiquidComposerCodec for bytes;
    using HyperLiquidComposerCodec for uint256;

    modifier onlyComposer() {
        if (msg.sender != address(this)) {
            revert IHyperLiquidComposerErrors.HyperLiquidComposer_InvalidCall_NotComposer(msg.sender);
        }
        _;
    }

    address public constant HLP_PRECOMPILE_WRITE = 0x3333333333333333333333333333333333333333;
    address public constant HLP_PRECOMPILE_READ_SPOT_BALANCE = 0x0000000000000000000000000000000000000801;

    address public immutable endpoint;

    IOFT public immutable oft;
    IERC20 public immutable token;

    IHyperAsset public oftAsset;
    IHyperAsset public hypeAsset;

    constructor(address _endpoint, address _oft) {
        if (_endpoint == address(0)) {
            revert IHyperLiquidComposerErrors.HyperLiquidComposer_InvalidArgument_EndpointShouldNotBeZeroAddress(
                _endpoint
            );
        }
        endpoint = _endpoint;

        // _oft address is validated by it returning token()
        oft = IOFT(_oft);
        token = IERC20(oft.token());
    }

    function validate_payload(bytes calldata _composeMessage) external pure returns (uint256, bytes32, bytes memory) {
        /// @dev Revert type : out of bounds or type cast error
        /// @dev Reason: Trying to slice the bytes object when it isn't of the form created by a OFTComposeMsgCodec.encode()
        uint256 amountLD = OFTComposeMsgCodec.amountLD(_composeMessage);
        bytes32 maybeSenderBytes32 = OFTComposeMsgCodec.composeFrom(_composeMessage);

        /// @dev This is an unbounded slice range without type casting thereby having the least chance of erroring
        bytes memory maybeReceiver = OFTComposeMsgCodec.composeMsg(_composeMessage);

        return (amountLD, maybeSenderBytes32, maybeReceiver);
    }

    function validate_addresses_or_refund(
        bytes memory _maybeReceiver,
        bytes32 _senderBytes32,
        uint256 _amountLD
    ) external pure returns (address) {
        /// @dev Test the conversion of the below (i.e. bytes and bytes32 into address)
        /// @dev This function returns address(0) if the sender is not a valid evm address
        address sender = _senderBytes32.into_evmAddress_or_zero();
        address receiver = _maybeReceiver.into_evmAddress_or_zero();

        /// @dev Initiate refund if the receiver is not a valid evm adress
        /// @dev Handling the if sender is not a valid evm address in the refund function
        if (receiver == address(0)) {
            bytes memory errMsg = abi.encodeWithSelector(
                IHyperLiquidComposerErrors.HyperLiquidComposer_Codec_InvalidMessage_UnexpectedLength.selector,
                _maybeReceiver,
                _maybeReceiver.length
            );
            revert IHyperLiquidComposerErrors.ErrorMsg(errMsg.createErrorMessage(sender, _amountLD));
        }

        return receiver;
    }

    /// @notice External function to quote the conversion of evm tokens to hypercore tokens
    ///
    /// @param _amount The amount of tokens to send
    /// @param _isOFT Whether the amount is an OFT amount or a HYPE amount
    ///
    /// @return IHyperAssetAmount - The amount of tokens to send to HyperCore (scaled on evm), dust (to be refunded), and the swap amount (of the tokens scaled on hypercore)
    function quoteHyperCoreAmount(uint256 _amount, bool _isOFT) public returns (IHyperAssetAmount memory) {
        IHyperAsset memory asset;
        uint64 maxTransferableAmount;

        if (_isOFT) {
            asset = oftAsset;
            maxTransferableAmount = _balanceOfHyperCore(oftAsset.assetBridgeAddress, oftAsset.coreIndexId);
        } else {
            asset = hypeAsset;
            maxTransferableAmount = _balanceOfHyperCore(hypeAsset.assetBridgeAddress, hypeAsset.coreIndexId);
        }

        return _amount.into_hyperAssetAmount(maxTransferableAmount, asset);
    }

    /// @notice External function to read the balance of the user in the hypercore
    ///
    /// @param _user The address of the user
    /// @param _tokenId The token id of the hypercore
    ///
    /// @return The balance of the user in the hypercore
    function balanceOfHyperCore(address _user, uint64 _tokenId) external view returns (uint64) {
        return _balanceOfHyperCore(_user, _tokenId);
    }

    /// @notice Internal function to read the balance of the user in the hypercore
    ///
    /// @param _user The address of the user
    /// @param _tokenId The token id of the hypercore
    ///
    /// @return The balance of the user in the hypercore
    function _balanceOfHyperCore(address _user, uint64 _tokenId) internal view returns (uint64) {
        bool success;
        bytes memory result;
        (success, result) = HLP_PRECOMPILE_READ_SPOT_BALANCE.staticcall(abi.encode(_user, _tokenId));
        if (!success) {
            revert IHyperLiquidComposerErrors.HyperLiquidComposerCore_SpotBalanceRead_Failed(_user, _tokenId);
        }
        return abi.decode(result, (IHyperLiquidReadPrecompile.SpotBalance)).total;
    }

    /// @notice Refunds the tokens to the sender
    /// @notice This function is called by the lzCompose function
    ///
    /// @dev The function refunds the oft token or msg.value to the sender if the error message contains a refund amount
    /// @dev This is applicable in cases when we would normally revert the transaction but can't due to the composer being the intermediate recipient of the minted tokens
    ///
    /// @param _err The error message
    /// @param _executor The caller of EndpointV2::lzCompose()
    ///
    /// @return errMsg.errorMessage The error message
    function completeRefund(bytes memory _err, address _executor) internal returns (bytes memory) {
        // All error messages beyond this point are of the form ErrorMessage(address refundTo, uint256 refundAmount, bytes errorMessage)

        bytes memory encodedErrorMessage = this.getErrorPayload(_err);
        ErrorMessagePayload memory errMsg = abi.decode(encodedErrorMessage, (ErrorMessagePayload));

        // The refund amount can vary based on partial refunds
        try this.refundERC20(errMsg.refundTo, errMsg.refundAmount) {} catch {
            emit ErrorERC20_Refund(errMsg.refundTo, errMsg.refundAmount);
        }

        address refundNative = errMsg.refundTo == address(0) ? _executor : errMsg.refundTo;

        // Try to refund the native tokens and if this fails, we fallback to the tx.origin
        try this.refundNativeTokens{ value: msg.value }(refundNative) {} catch {
            (bool success, ) = tx.origin.call{ value: msg.value }("");
            if (!success) {
                emit ErrorHYPE_Refund(tx.origin, msg.value);
            }

            emit ErrorHYPE_Refund(refundNative, msg.value);
        }
        return errMsg.errorMessage;
    }

    /// @notice Refunds the native tokens to the refund address
    /// @notice This function is called by the refundTokens function
    ///
    /// @dev If the refund address is set to the zero address - it means that the transaction sender is a non-evm address and the receiver is malformed.
    /// @dev In this case, the tokens are locked in the composer.
    ///
    /// @param _refundAddress The address to refund the native tokens to
    /// @param _amount The amount of tokens to refund
    function refundERC20(address _refundAddress, uint256 _amount) external payable onlyComposer {
        if (_amount > 0 && _refundAddress != address(0)) {
            token.safeTransfer(_refundAddress, _amount);
        }
    }

    /// @notice Refunds the native tokens to the refund address
    /// @notice This function is called by the refundTokens function
    ///
    /// @dev It is possible that the refund address is a contract without fallback or receive functions - in that case the transfer fails and tokens will be locked in the contract.
    /// @dev Since this is an external function - the msg.value can be different to the msg.value sent to the lzCompose function by tx.origin
    /// @dev It is different in the case of a partial refund where the call is:
    /// @dev `this.refundNativeTokens{ value: amounts.dust }(_receiver)`
    /// @dev In this case, the msg.value is the amount of the dust and not the msg.value sent to the lzCompose function by tx.origin
    ///
    /// @param _refundAddress The address to refund the native tokens to
    function refundNativeTokens(address _refundAddress) external payable onlyComposer {
        if (msg.value > 0 && _refundAddress != address(0)) {
            (bool success, ) = _refundAddress.call{ value: msg.value }("");
            if (!success) {
                revert IHyperLiquidComposerErrors.HyperLiquidComposer_FailedToRefund_HYPE(_refundAddress, msg.value);
            }
        }
    }

    function getOFTAsset() external view returns (IHyperAsset memory) {
        return oftAsset;
    }

    function getHypeAsset() external view returns (IHyperAsset memory) {
        return hypeAsset;
    }

    function getErrorPayload(bytes calldata _err) external pure returns (bytes memory) {
        return _err.extractErrorPayload();
    }
}
