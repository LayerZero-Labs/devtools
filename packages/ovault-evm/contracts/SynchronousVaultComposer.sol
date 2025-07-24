// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IOFT, SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { IOAppCore } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppCore.sol";
import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import { IOVaultComposer } from "./interfaces/IOVaultComposer.sol";

contract SynchronousVaultComposer is IOVaultComposer, ReentrancyGuard {
    using OFTComposeMsgCodec for bytes;
    using OFTComposeMsgCodec for bytes32;
    using SafeERC20 for IERC20;

    address public immutable ASSET_OFT; // any OFT
    address public immutable SHARE_OFT; // lockbox adapter

    address public immutable ASSET_ERC20;
    address public immutable SHARE_ERC20;

    IERC4626 public immutable OVAULT; // must be a synchronous vault - no lockups

    address public immutable ENDPOINT;

    uint32 public immutable VAULT_EID;

    constructor(address _ovault, address _assetOFT, address _shareOFT) {
        OVAULT = IERC4626(_ovault);
        ASSET_OFT = _assetOFT;
        SHARE_OFT = _shareOFT;

        SHARE_ERC20 = _ovault;
        ASSET_ERC20 = address(OVAULT.asset());

        /// @dev ShareOFT must be a lockbox adapter.
        /// @dev burn() on tokens when they exit changes totalSupply() which the asset:share ratio depends on.
        if (!IOFT(_shareOFT).approvalRequired()) {
            revert ShareOFTShouldBeLockboxAdapter(address(_shareOFT));
        }

        if (address(IOFT(_shareOFT).token()) != SHARE_ERC20) {
            revert ShareOFTInnerTokenShouldBeOVault(address(IOFT(_shareOFT).token()), SHARE_ERC20);
        }

        if (IOFT(_assetOFT).token() != ASSET_ERC20) {
            revert AssetOFTInnerTokenShouldBeOvaultAsset(address(IOFT(_assetOFT).token()), ASSET_ERC20);
        }

        ENDPOINT = address(IOAppCore(ASSET_OFT).endpoint());
        VAULT_EID = ILayerZeroEndpointV2(ENDPOINT).eid();

        /// @notice Approve the ovault to spend the share and asset tokens held by this contract
        IERC20(SHARE_ERC20).approve(address(_ovault), type(uint256).max);
        IERC20(ASSET_ERC20).approve(address(_ovault), type(uint256).max);

        /// @notice Approve the shareOFTAdapter with the share tokens held by this contract
        IERC20(SHARE_ERC20).approve(_shareOFT, type(uint256).max);
        if (IOFT(_assetOFT).approvalRequired()) IERC20(ASSET_ERC20).approve(_assetOFT, type(uint256).max);
    }

    /// @dev This composer is designed to handle refunds to an EOA address and not a contract.
    /// @dev Any revert in atomicOvaultOperation() causes a reufund on source EXCEPT for InvalidMsgValue
    function lzCompose(
        address _composeCaller, // The OFT used on refund, also the vaultIn token. TODO name of this param
        bytes32 _guid,
        bytes calldata _message, // expected to be abi.encode(SendParam hopSendParam,uint256 minMsgValue)
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) external payable virtual override {
        if (msg.sender != ENDPOINT) revert OnlyEndpoint(msg.sender);
        if (_composeCaller != ASSET_OFT && _composeCaller != SHARE_OFT) revert OFTCannotVaultOperation(_composeCaller);

        bytes32 composeFrom = _message.composeFrom();
        bytes memory composeMsg = _message.composeMsg();
        uint256 amount = _message.amountLD();

        try this.handleCompose{ value: msg.value }(_composeCaller, composeFrom, composeMsg, amount) {
            emit Sent(_guid);
        } catch (bytes memory _err) {
            /// @dev If the revert was due to InvalidMsgValue, revert with the same error so that we can retry from the Endpoint
            if (bytes4(_err) == InvalidMsgValue.selector) {
                assembly {
                    revert(add(32, _err), mload(_err))
                }
            }

            _refund(_composeCaller, _message, amount, tx.origin);
            emit Refunded(_guid);
        }
    }

    /// =========================== Vault FUNCTIONS ========================================

    function handleCompose(
        address _oft,
        bytes32 _composeFrom,
        bytes memory _composeMsg,
        uint256 _amount
    ) external payable {
        // Can only be called by self
        if (msg.sender != address(this)) revert OnlySelf(msg.sender);

        // TODO comment why we do this
        (SendParam memory sendParam, uint256 minMsgValue) = abi.decode(_composeMsg, (SendParam, uint256));
        if (msg.value < minMsgValue) revert InvalidMsgValue(minMsgValue, msg.value); /// @dev only happens on lzCompose

        if (_oft == ASSET_OFT) {
            _depositAndSend(_composeFrom, _amount, sendParam, tx.origin);
        } else {
            _redeemAndSend(_composeFrom, _amount, sendParam, tx.origin);
        }
    }

    function depositAndSend(
        uint256 _assetAmount,
        SendParam memory _sendParam,
        address _refundAddress
    ) external payable virtual nonReentrant {
        IERC20(ASSET_ERC20).safeTransferFrom(msg.sender, address(this), _assetAmount);
        _depositAndSend(OFTComposeMsgCodec.addressToBytes32(msg.sender), _assetAmount, _sendParam, _refundAddress);
    }

    function _depositAndSend(
        bytes32 _depositor,
        uint256 _assetAmount,
        SendParam memory _sendParam,
        address _refundAddress
    ) internal virtual {
        uint256 shareAmount = _deposit(_depositor, _assetAmount);
        _checkSlippage(shareAmount, _sendParam.minAmountLD);

        _sendParam.amountLD = shareAmount;
        _sendParam.minAmountLD = 0;

        _send(SHARE_OFT, _sendParam, _refundAddress);
    }

    function _deposit(bytes32 /*_depositor*/, uint256 _assetAmount) internal virtual returns (uint256 shareAmount) {
        shareAmount = OVAULT.deposit(_assetAmount, address(this));
    }

    function redeemAndSend(
        uint256 _shareAmount,
        SendParam memory _sendParam,
        address _refundAddress
    ) external payable virtual nonReentrant {
        IERC20(SHARE_ERC20).safeTransferFrom(msg.sender, address(this), _shareAmount);
        _redeemAndSend(OFTComposeMsgCodec.addressToBytes32(msg.sender), _shareAmount, _sendParam, _refundAddress);
    }

    function _redeemAndSend(
        bytes32 _redeemer,
        uint256 _shareAmount,
        SendParam memory _sendParam,
        address _refundAddress
    ) internal virtual {
        uint256 assetAmount = _redeem(_redeemer, _shareAmount);
        _checkSlippage(assetAmount, _sendParam.minAmountLD);

        _sendParam.amountLD = assetAmount;
        _sendParam.minAmountLD = 0;

        _send(ASSET_OFT, _sendParam, _refundAddress);
    }

    function _redeem(bytes32 /*_redeemer*/, uint256 _shareAmount) internal virtual returns (uint256 assetAmount) {
        assetAmount = OVAULT.redeem(_shareAmount, address(this), address(this));
    }

    // TODO maybe do preview and pass to sendParam perhaps
    function quoteSend(address _oft, SendParam memory _sendParam) external view virtual returns (MessagingFee memory) {
        return IOFT(_oft).quoteSend(_sendParam, false);
    }

    /// @dev In the case that slippage does not exist, can always return 0
    function _checkSlippage(uint256 _amountLD, uint256 _minAmountLD) internal view virtual {
        if (_amountLD < _minAmountLD) {
            revert SlippageEncountered(_amountLD, _minAmountLD);
        }
    }

    /// =========================== Internal ==========================================

    /// @notice all transfer MUST go through this function
    function _send(address _oft, SendParam memory _sendParam, address _refundAddress) internal {
        if (_sendParam.dstEid == VAULT_EID) {
            // Local transfer, just send the token

            /// @dev Can do this because _oft is validated before this function is called
            address erc20 = _oft == ASSET_OFT ? ASSET_ERC20 : SHARE_ERC20;

            if (msg.value > 0) revert InvalidMsgValue(0, msg.value);
            IERC20(erc20).safeTransfer(_sendParam.to.bytes32ToAddress(), _sendParam.amountLD);
        } else {
            // crosschain send
            IOFT(_oft).send{ value: msg.value }(_sendParam, MessagingFee(msg.value, 0), _refundAddress);
        }
    }

    function _refund(address _oft, bytes calldata _message, uint256 _amount, address _refundAddress) internal virtual {
        /// @dev Extracted from the _message header. Will always be part of the _message since it is created by lzReceive
        /// @dev Used on refund AND when amount == 0
        SendParam memory refundSendParam;
        refundSendParam.dstEid = OFTComposeMsgCodec.srcEid(_message);
        refundSendParam.to = OFTComposeMsgCodec.composeFrom(_message);
        refundSendParam.amountLD = _amount;

        IOFT(_oft).send{ value: msg.value }(refundSendParam, MessagingFee(msg.value, 0), _refundAddress);
    }

    receive() external payable {}
}
