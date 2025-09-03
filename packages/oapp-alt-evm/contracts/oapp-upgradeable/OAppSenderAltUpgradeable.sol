// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

// @dev Import the 'MessagingFee' and 'MessagingReceipt' so it's exposed to OApp implementers
// solhint-disable-next-line no-unused-import
import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { OAppSenderUpgradeable } from "@layerzerolabs/oapp-evm-upgradeable/contracts/oapp/OAppSenderUpgradeable.sol";
import { MessagingParams, MessagingFee, MessagingReceipt } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

/**
 * @title OAppSenderAltUpgradeable
 * @dev Abstract upgradeable contract implementing the OAppSenderAlt functionality for sending messages to a LayerZero endpoint with alternative payment methods.
 */
abstract contract OAppSenderAltUpgradeable is OAppSenderUpgradeable {
    using SafeERC20 for IERC20;

    // Additional error messages for the OAppSenderAlt contract.
    error NativeTokenUnavailable();

    /// @dev storage slot not required because immutable variables are stored in the bytecode on deployment as constants
    address public immutable nativeToken;

    constructor() {
        nativeToken = endpoint.nativeToken();
    }

    /**
     * @dev Initializes the OAppSenderAlt with the provided delegate.
     * @param _delegate The delegate capable of making OApp configurations inside of the endpoint.
     * @dev Ownable is not initialized here on purpose. It should be initialized in the child contract to
     * accommodate the different version of Ownable.
     */
    function __OAppSenderAlt_init(address _delegate) internal onlyInitializing {
        __OAppSender_init(_delegate);
    }

    function __OAppSenderAlt_init_unchained() internal onlyInitializing {}

    /**
     * @dev Internal function to interact with the LayerZero EndpointV2.send() for sending a message.
     * @param _dstEid The destination endpoint ID.
     * @param _message The message payload.
     * @param _options The message execution options (e.g., for sending gas to destination).
     * @param _fee The calculated LayerZero fee for the message.
     *         - nativeFee: The native fee.
     *         - lzTokenFee: The lzToken fee.
     * @param _refundAddress The address to receive any excess funds.
     * @return receipt The receipt for the sent message.
     *         - guid: The unique identifier for the sent message.
     *         - nonce: The nonce of the sent message.
     *         - fee: The LayerZero fee incurred for the message.
     */
    function _lzSend(
        uint32 _dstEid,
        bytes memory _message,
        bytes memory _options,
        MessagingFee memory _fee,
        address _refundAddress
    ) internal virtual override returns (MessagingReceipt memory receipt) {
        // @dev Push corresponding fees to the endpoint, any excess is sent back to the _refundAddress from the endpoint.
        _payNative(_fee.nativeFee);
        if (_fee.lzTokenFee > 0) _payLzToken(_fee.lzTokenFee);

        return
            // solhint-disable-next-line check-send-result
            endpoint.send(
                MessagingParams(_dstEid, _getPeerOrRevert(_dstEid), _message, _options, _fee.lzTokenFee > 0),
                _refundAddress
            );
    }

    /**
     * @dev Internal function to pay the native fee associated with the message.
     * @param _nativeFee The native fee to be paid.
     * @return nativeFee The amount of native currency paid.
     *
     * @dev Should be overridden in the event the LayerZero endpoint requires a different native currency.
     * @dev Some EVMs use an ERC20 as a method for paying transactions/gasFees.
     * @dev The endpoint is EITHER/OR, ie. it will NOT support both types of native payment at a time.
     */
    function _payNative(uint256 _nativeFee) internal virtual override returns (uint256 nativeFee) {
        if (nativeToken == address(0)) revert NativeTokenUnavailable();

        // Pay Native token fee by sending tokens to the endpoint.
        IERC20(nativeToken).safeTransferFrom(msg.sender, address(endpoint), _nativeFee);

        return _nativeFee;
    }
}
