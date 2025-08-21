// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { IOFT } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { ICoreWriter } from "../interfaces/ICoreWriter.sol";

import { HyperLiquidComposerCodec } from "../library/HyperLiquidComposerCodec.sol";
import { HyperLiquidComposer } from "../HyperLiquidComposer.sol";

abstract contract RecoverableComposer is HyperLiquidComposer {
    modifier onlyRecoveryAddress() {
        if (msg.sender != RECOVERY_ADDRESS) revert NotRecoveryAddress();
        _;
    }

    using SafeERC20 for IERC20;
    using HyperLiquidComposerCodec for uint64;

    error MaxRetrieveAmountExceeded(uint256 maxAmount, uint256 requestedAmount);
    error NotRecoveryAddress();

    event Retrieved(uint64 indexed coreIndexId, uint256 amount, address indexed to);
    event Recovered(address indexed to, uint256 amount);

    uint256 public constant FULL_TRANSFER = 0;
    uint64 public constant USDC_CORE_INDEX = 0;

    address public immutable RECOVERY_ADDRESS;

    constructor(address _recoveryAddress) {
        RECOVERY_ADDRESS = _recoveryAddress;
    }

    function retrieveCoreERC20(uint64 _coreAmount) public onlyRecoveryAddress {
        uint64 maxTransferAmt = _getMaxTransferAmount(oftAsset.coreIndexId, _coreAmount);

        _submitCoreWriterTransfer(oftAsset.assetBridgeAddress, oftAsset.coreIndexId, maxTransferAmt);
        emit Retrieved(oftAsset.coreIndexId, maxTransferAmt, oftAsset.assetBridgeAddress);
    }

    function retrieveCoreHYPE(uint64 _coreAmount) public onlyRecoveryAddress {
        uint64 maxTransferAmt = _getMaxTransferAmount(hypeAsset.coreIndexId, _coreAmount);

        _submitCoreWriterTransfer(hypeAsset.assetBridgeAddress, hypeAsset.coreIndexId, maxTransferAmt);
        emit Retrieved(hypeAsset.coreIndexId, maxTransferAmt, hypeAsset.assetBridgeAddress);
    }

    function retrieveCoreUSDC(uint64 _coreAmount, address _to) public onlyRecoveryAddress {
        uint64 maxTransferAmt = _getMaxTransferAmount(USDC_CORE_INDEX, _coreAmount);

        _submitCoreWriterTransfer(_to, USDC_CORE_INDEX, maxTransferAmt);
        emit Retrieved(USDC_CORE_INDEX, maxTransferAmt, _to);
    }

    function recoverEvmERC20(uint256 _evmAmount) public onlyRecoveryAddress {
        recoverEvmERC20(_evmAmount, RECOVERY_ADDRESS);
    }

    function recoverEvmNative(uint256 _evmAmount) public onlyRecoveryAddress {
        recoverEvmNative(_evmAmount, RECOVERY_ADDRESS);
    }

    function recoverEvmERC20(uint256 _evmAmount, address _to) public onlyRecoveryAddress {
        uint256 recoverAmt = _evmAmount == FULL_TRANSFER ? IERC20(TOKEN).balanceOf(address(this)) : _evmAmount;

        IERC20(TOKEN).safeTransfer(_to, recoverAmt);
        emit Recovered(_to, recoverAmt);
    }

    function recoverEvmNative(uint256 _evmAmount, address _to) public onlyRecoveryAddress {
        uint256 recoverAmt = _evmAmount == FULL_TRANSFER ? address(this).balance : _evmAmount;

        (bool success, ) = _to.call{ value: recoverAmt }("");
        require(success, "Transfer failed");
        emit Recovered(_to, recoverAmt);
    }

    function _getMaxTransferAmount(uint64 _coreIndexId, uint64 _coreAmount) internal view returns (uint64) {
        uint64 maxTransferAmt = _balanceOfHyperCore(address(this), _coreIndexId);
        if (_coreAmount > maxTransferAmt) {
            revert MaxRetrieveAmountExceeded(maxTransferAmt, _coreAmount);
        }
        return _coreAmount == FULL_TRANSFER ? maxTransferAmt : _coreAmount;
    }

    function _submitCoreWriterTransfer(address _to, uint64 _coreIndexId, uint64 _transferAmt) internal {
        bytes memory action = abi.encode(_to, _coreIndexId, _transferAmt);
        bytes memory payload = abi.encodePacked(SPOT_SEND_HEADER, action);
        ICoreWriter(HLP_CORE_WRITER).sendRawAction(payload);
    }
}
