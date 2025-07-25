// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IERC4626 } from "@openzeppelin/contracts/interfaces/IERC4626.sol";

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IOFT, SendParam, MessagingFee } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { IOAppCore } from "@layerzerolabs/oapp-evm/contracts/oapp/interfaces/IOAppCore.sol";
import { ILayerZeroEndpointV2 } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";
import { OFTComposeMsgCodec } from "@layerzerolabs/oft-evm/contracts/libs/OFTComposeMsgCodec.sol";

import { IVaultComposerSync } from "./interfaces/IVaultComposerSync.sol";

contract VaultComposerSync is IVaultComposerSync, ReentrancyGuard {
    using OFTComposeMsgCodec for bytes;
    using OFTComposeMsgCodec for bytes32;
    using SafeERC20 for IERC20;

    // @dev Must be a synchronous vault - NO 2-step redemptions/deposit windows
    IERC4626 public immutable VAULT;

    address public immutable ASSET_OFT;
    address public immutable ASSET_ERC20;
    address public immutable SHARE_OFT;
    address public immutable SHARE_ERC20;

    address public immutable ENDPOINT;
    uint32 public immutable VAULT_EID;

    constructor(address _vault, address _assetOFT, address _shareOFT) {
        VAULT = IERC4626(_vault);

        ASSET_OFT = _assetOFT;
        ASSET_ERC20 = IOFT(ASSET_OFT).token();
        SHARE_OFT = _shareOFT;
        SHARE_ERC20 = IOFT(SHARE_OFT).token();

        ENDPOINT = address(IOAppCore(ASSET_OFT).endpoint());
        VAULT_EID = ILayerZeroEndpointV2(ENDPOINT).eid();

        if (SHARE_ERC20 != address(VAULT)) {
            revert ShareTokenNotVault(SHARE_ERC20, address(VAULT));
        }

        if (ASSET_ERC20 != address(VAULT.asset())) {
            revert AssetTokenNotVaultAsset(ASSET_ERC20, address(VAULT.asset()));
        }

        // @dev ShareOFT must be an OFT adapter. We can infer this by checking 'approvalRequired()'.
        // @dev burn() on tokens when a user sends changes totalSupply() which the asset:share ratio depends on.
        if (!IOFT(SHARE_OFT).approvalRequired()) revert ShareOFTNotAdapter(SHARE_OFT);

        // @dev Approve the vault to spend the share and asset tokens held by this contract
        IERC20(SHARE_ERC20).approve(_vault, type(uint256).max);
        IERC20(ASSET_ERC20).approve(_vault, type(uint256).max);

        // @dev Approve the share adapter with the share tokens held by this contract
        IERC20(SHARE_ERC20).approve(_shareOFT, type(uint256).max);
        // @dev If the asset OFT is an adapter, approve it as well
        if (IOFT(_assetOFT).approvalRequired()) IERC20(ASSET_ERC20).approve(_assetOFT, type(uint256).max);
    }

    // @dev This composer is designed to handle refunds to an EOA address and not a contract.
    // @dev Any revert in handleCompose() causes a refund back to the src EXCEPT for InsufficientMsgValue.
    function lzCompose(
        address _composeCaller, // The OFT used on refund, also the vaultIn token.
        bytes32 _guid,
        bytes calldata _message, // expected to be abi.encode(SendParam hopSendParam,uint256 minMsgValue)
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) external payable virtual override {
        if (msg.sender != ENDPOINT) revert OnlyEndpoint(msg.sender);
        if (_composeCaller != ASSET_OFT && _composeCaller != SHARE_OFT) revert OnlyValidComposeCaller(_composeCaller);

        bytes32 composeFrom = _message.composeFrom();
        bytes memory composeMsg = _message.composeMsg();
        uint256 amount = _message.amountLD();

        // TODO comment this
        try this.handleCompose{ value: msg.value }(_composeCaller, composeFrom, composeMsg, amount) {
            emit Sent(_guid);
        } catch (bytes memory _err) {
            // TODO comment here about WHY we want to provide this logic
            // @dev If the revert was due to InsufficientMsgValue, revert with the same error so that we can retry from the Endpoint
            if (bytes4(_err) == InsufficientMsgValue.selector) {
                assembly {
                    revert(add(32, _err), mload(_err))
                }
            }

            _refund(_composeCaller, _message, amount, tx.origin);
            emit Refunded(_guid);
        }
    }

    function handleCompose(
        address _oftIn,
        bytes32 _composeFrom,
        bytes memory _composeMsg,
        uint256 _amount
    ) external payable {
        // @dev Can only be called by self
        if (msg.sender != address(this)) revert OnlySelf(msg.sender);

        // TODO comment why we do this
        (SendParam memory sendParam, uint256 minMsgValue) = abi.decode(_composeMsg, (SendParam, uint256));
        if (msg.value < minMsgValue) revert InsufficientMsgValue(minMsgValue, msg.value);

        if (_oftIn == ASSET_OFT) {
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
        _depositAndSend(
            OFTComposeMsgCodec.addressToBytes32(msg.sender),
            _assetAmount,
            _sendParam,
            _refundAddress
        );
    }

    function _depositAndSend(
        bytes32 _depositor,
        uint256 _assetAmount,
        SendParam memory _sendParam,
        address _refundAddress
    ) internal virtual {
        uint256 shareAmount = _deposit(_depositor, _assetAmount);
        _assertSlippage(shareAmount, _sendParam.minAmountLD);

        _sendParam.amountLD = shareAmount;
        _sendParam.minAmountLD = 0;

        _send(SHARE_OFT, _sendParam, _refundAddress);
    }

    function _deposit(bytes32 /*_depositor*/, uint256 _assetAmount) internal virtual returns (uint256 shareAmount) {
        shareAmount = VAULT.deposit(_assetAmount, address(this));
    }

    function redeemAndSend(
        uint256 _shareAmount,
        SendParam memory _sendParam,
        address _refundAddress
    ) external payable virtual nonReentrant {
        IERC20(SHARE_ERC20).safeTransferFrom(msg.sender, address(this), _shareAmount);
        _redeemAndSend(
            OFTComposeMsgCodec.addressToBytes32(msg.sender),
            _shareAmount,
            _sendParam,
            _refundAddress
        );
    }

    function _redeemAndSend(
        bytes32 _redeemer,
        uint256 _shareAmount,
        SendParam memory _sendParam,
        address _refundAddress
    ) internal virtual {
        uint256 assetAmount = _redeem(_redeemer, _shareAmount);
        _assertSlippage(assetAmount, _sendParam.minAmountLD);

        _sendParam.amountLD = assetAmount;
        _sendParam.minAmountLD = 0;

        _send(ASSET_OFT, _sendParam, _refundAddress);
    }

    function _redeem(bytes32 /*_redeemer*/, uint256 _shareAmount) internal virtual returns (uint256 assetAmount) {
        assetAmount = VAULT.redeem(_shareAmount, address(this), address(this));
    }

    /// @dev In the case that slippage does not exist, can just override with empty function
    function _assertSlippage(uint256 _amountLD, uint256 _minAmountLD) internal view virtual {
        if (_amountLD < _minAmountLD) revert SlippageExceeded(_amountLD, _minAmountLD);
    }

    // TODO maybe do preview and pass to sendParam perhaps
    function quoteSend(address _oft, SendParam memory _sendParam) external view virtual returns (MessagingFee memory) {
        return IOFT(_oft).quoteSend(_sendParam, false);
    }

    function _send(address _oft, SendParam memory _sendParam, address _refundAddress) internal {
        if (_sendParam.dstEid == VAULT_EID) {
            /// @dev Can do this because _oft is validated before this function is called
            address erc20 = _oft == ASSET_OFT ? ASSET_ERC20 : SHARE_ERC20;

            if (msg.value > 0) revert InsufficientMsgValue(0, msg.value);
            IERC20(erc20).safeTransfer(_sendParam.to.bytes32ToAddress(), _sendParam.amountLD);
        } else {
            // crosschain send
            IOFT(_oft).send{ value: msg.value }(_sendParam, MessagingFee(msg.value, 0), _refundAddress);
        }
    }

    function _refund(address _oft, bytes calldata _message, uint256 _amount, address _refundAddress) internal virtual {
        /// @dev Extracted from the _message header. Will always be part of the _message since it is created by lzReceive
        SendParam memory refundSendParam;
        refundSendParam.dstEid = OFTComposeMsgCodec.srcEid(_message);
        refundSendParam.to = OFTComposeMsgCodec.composeFrom(_message);
        refundSendParam.amountLD = _amount;

        IOFT(_oft).send{ value: msg.value }(refundSendParam, MessagingFee(msg.value, 0), _refundAddress);
    }

    receive() external payable {}
}
