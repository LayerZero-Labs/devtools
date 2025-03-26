// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import { IOFT } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { HyperLiquidComposerCodec } from "./library/HyperLiquidComposerCodec.sol";
import { IHyperLiquidComposerErrors, ErrorMessage } from "./interfaces/IHyperLiquidComposerErrors.sol";
import { IHyperLiquidWritePrecompile } from "./interfaces/IHyperLiquidWritePrecompile.sol";
import { IHyperLiquidReadPrecompile } from "./interfaces/IHyperLiquidReadPrecompile.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";
import { IHyperLiquidComposerCore, IHyperAsset, IHyperAssetAmount } from "./interfaces/IHyperLiquidComposerCore.sol";

contract HyperLiquidComposerCore is IHyperLiquidComposerCore {
    modifier onlyComposer() {
        if (msg.sender != address(this)) {
            revert IHyperLiquidComposerErrors.HyperLiquidComposer_InvalidCall_NotComposer(msg.sender);
        }
        _;
    }

    /// @dev The length of the message that is valid for the HyperLiquidComposer
    /// @dev This is 20 bytes because addresses are 20 bytes
    /// @dev We are in encodePacked mode, if we are in encode mode, the length is 32 bytes
    uint256 public constant VALID_COMPOSE_MESSAGE_LENGTH_PACKED = 20;
    uint256 public constant VALID_COMPOSE_MESSAGE_LENGTH_ENCODE = 32;

    address public constant L1WritePrecompileAddress = 0x3333333333333333333333333333333333333333;
    address public constant L1ReadPrecompileAddress_SpotBalance = 0x0000000000000000000000000000000000000801;

    address public immutable endpoint;
    IOFT public immutable oft;
    IERC20 public immutable token;

    IHyperAsset public oftAsset;
    IHyperAsset public hypeAsset;

    /// @notice Validates the compose message and decodes it into an address and amount
    /// @notice This function is called by the HyperLiquidComposer contract
    ///
    /// @param _composeMessage The compose message to validate and decode
    ///
    /// @return _receiver The address of the receiver
    /// @return _amountLD The amount of tokens to send
    function validateAndDecodeMessage(
        bytes calldata _composeMessage
    ) public pure returns (address _receiver, uint256 _amountLD) {
        bytes memory message = OFTComposeMsgCodec.composeMsg(_composeMessage);

        _amountLD = OFTComposeMsgCodec.amountLD(_composeMessage);

        // Addresses in EVM are 20 bytes when packed or 32 bytes when encoded
        // So if the message's length is not 20 bytes, we can pre-emptively revert
        if (
            message.length != VALID_COMPOSE_MESSAGE_LENGTH_PACKED &&
            message.length != VALID_COMPOSE_MESSAGE_LENGTH_ENCODE
        ) {
            bytes memory errMsg = abi.encodeWithSelector(
                IHyperLiquidComposerErrors.HyperLiquidComposer_Codec_InvalidMessage_UnexpectedLength.selector,
                message,
                message.length
            );
            /// @dev Handling the case when the transaction is from 1 bytes-20 address and we can prevent the funds from being stuck in the composer
            /// @dev We can optimisitcally assume that the bytes20 address is an evm-address
            /// @dev If this is a non-evm address (i.e. a bytes32 on aptos move, or solana) then this abi.decode will revert and the following revert will not be thrown
            address sender = abi.decode(bytes.concat(OFTComposeMsgCodec.composeFrom(_composeMessage)), (address));
            /// @dev THrow the following error message ONLY if the sender is bytes20. It causes lzCompose to refund the sender and then emit the error message
            revert IHyperLiquidComposerErrors.ErrorMsg(
                HyperLiquidComposerCodec.createErrorMessage(sender, _amountLD, errMsg)
            );
        }

        // Since we are encodePacked, we can just decode the first 20 bytes as an address
        if (message.length == VALID_COMPOSE_MESSAGE_LENGTH_PACKED) {
            _receiver = address(bytes20(message));
        } else {
            _receiver = abi.decode(message, (address));
        }
    }

    /// @notice Quotes the amount of tokens that will be sent to HyperCore
    /// @notice This function is externally callable
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

        return HyperLiquidComposerCodec.into_hyper_asset_amount(_amount, maxTransferableAmount, asset);
    }

    function balanceOfHyperCore(address _user, uint64 _tokenId) external view returns (uint64) {
        return _balanceOfHyperCore(_user, _tokenId);
    }

    function _balanceOfHyperCore(address _user, uint64 _tokenId) internal view returns (uint64) {
        bool success;
        bytes memory result;
        (success, result) = L1ReadPrecompileAddress_SpotBalance.staticcall(abi.encode(_user, _tokenId));
        require(success, "SpotBalance precompile call failed");
        return abi.decode(result, (IHyperLiquidReadPrecompile.SpotBalance)).total;
    }

    function getOFTAsset() external view returns (IHyperAsset memory) {
        return oftAsset;
    }

    function getHypeAsset() external view returns (IHyperAsset memory) {
        return hypeAsset;
    }

    /// @notice Refunds the tokens to the sender
    /// @notice This function is called by the lzCompose function
    ///
    /// @dev The function refunds the oft token or msg.value to the sender if the error message contains a refund amount
    /// @dev This is applicable in cases when we would normally revert the transaction but can't due to the composer being the intermediate recipient of the minted tokens
    ///
    /// @return errMsg.errorMessage The error message
    function refundTokens(bytes calldata err) external payable onlyComposer returns (bytes memory) {
        if (err.length == 0) {
            // This is the only non-custom revert - failure @ abi.decode(bytes, (address))
            return abi.encode("Error: Not logic based - malformed receiver address with a non-evm sender");
        }
        // All error messages beyond this point as of the form ErrorMessage(address refundTo, uint256 refundAmount, bytes errorMessage)
        // Here we strip out the revert message to extract the payload ErrorMsg(bytes errorMessage) - ('0x' + 32 bytes) * 2 = 64 bytes
        bytes memory encodedErrorMessage = err[64 + 4:];
        ErrorMessage memory errMsg = abi.decode(encodedErrorMessage, (ErrorMessage));
        // The refund amount can vary based on partial refunds
        if (errMsg.refundAmount > 0) {
            token.transfer(errMsg.refundTo, errMsg.refundAmount);
            emit errorRefund(errMsg.refundTo, errMsg.refundAmount);
        }
        try this.refundNativeTokens{ value: msg.value }(errMsg.refundTo) {} catch {
            emit errorNativeRefund_Failed(errMsg.refundTo, msg.value);
        }
        return errMsg.errorMessage;
    }

    /// @notice Refunds the native tokens to the refund address
    /// @notice This function is called by the refundTokens function
    ///
    /// @dev It is possible that the address is a contract without fallback or receive functions - in that case the transfer fails and tokens will be locked in the contract.
    /// @dev Since msg.value is used as the amount to refund, and msg.value reduces during tx execution, it isn't possible to partial transfer and then get the entire amount back.
    /// @dev The refund amount in this case would be the amount of the tx minus the amount of the error refund.
    ///
    /// @param refundAddress The address to refund the native tokens to
    function refundNativeTokens(address refundAddress) external payable onlyComposer {
        if (msg.value > 0) {
            token.transfer(refundAddress, msg.value);
        }
    }
}
