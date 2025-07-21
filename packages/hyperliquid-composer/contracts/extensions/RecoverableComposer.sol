// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { IOFT } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { ICoreWriter } from "../interfaces/ICoreWriter.sol";

import { HyperLiquidComposerCodec } from "../library/HyperLiquidComposerCodec.sol";
import { HyperLiquidComposer } from "../HyperLiquidComposer.sol";

abstract contract RecoverableComposer is HyperLiquidComposer {
    modifier onlyRecoveryAddress() {
        require(msg.sender == RECOVERY_ADDRESS, "Not recovery address");
        _;
    }

    using SafeERC20 for IERC20;
    using HyperLiquidComposerCodec for uint64;

    uint256 public constant FULL_TRANSFER = 0;
    uint64 public constant USDC_CORE_INDEX = 0;

    address public immutable RECOVERY_ADDRESS;
    IERC20 public immutable innerToken;

    constructor(address _oft, address _recoveryAddress) {
        RECOVERY_ADDRESS = _recoveryAddress;
        innerToken = IERC20(IOFT(_oft).token());
    }

    function transferCorespotERC20(uint256 _coreAmount) public onlyRecoveryAddress {
        uint256 transferAmt = _coreAmount == FULL_TRANSFER
            ? _balanceOfHyperCore(address(this), oftAsset.coreIndexId)
            : _coreAmount;

        bytes memory action = abi.encode(oftAsset.assetBridgeAddress, oftAsset.coreIndexId, transferAmt);
        bytes memory payload = abi.encodePacked(SPOT_SEND_HEADER, action);
        ICoreWriter(HLP_CORE_WRITER).sendRawAction(payload);
    }

    function transferCorespotHYPE(uint256 _coreAmount) public onlyRecoveryAddress {
        uint256 transferAmt = _coreAmount == FULL_TRANSFER
            ? _balanceOfHyperCore(address(this), hypeAsset.coreIndexId)
            : _coreAmount;

        bytes memory action = abi.encode(hypeAsset.assetBridgeAddress, hypeAsset.coreIndexId, transferAmt);
        bytes memory payload = abi.encodePacked(SPOT_SEND_HEADER, action);
        ICoreWriter(HLP_CORE_WRITER).sendRawAction(payload);
    }

    function transferCorespotUSDC(uint256 _coreAmount, address _to) public onlyRecoveryAddress {
        uint256 transferAmt = _coreAmount == FULL_TRANSFER
            ? _balanceOfHyperCore(address(this), USDC_CORE_INDEX)
            : _coreAmount;

        bytes memory action = abi.encode(_to, USDC_CORE_INDEX, transferAmt);
        bytes memory payload = abi.encodePacked(SPOT_SEND_HEADER, action);
        ICoreWriter(HLP_CORE_WRITER).sendRawAction(payload);
    }

    function recoverFundsERC20(uint256 _evmAmount) public onlyRecoveryAddress {
        uint256 recoverAmt = _evmAmount == FULL_TRANSFER ? innerToken.balanceOf(address(this)) : _evmAmount;

        innerToken.safeTransfer(RECOVERY_ADDRESS, recoverAmt);
    }

    function recoverFundsNative(uint256 _evmAmount) public onlyRecoveryAddress {
        uint256 recoverAmt = _evmAmount == FULL_TRANSFER ? address(this).balance : _evmAmount;

        (bool success, ) = RECOVERY_ADDRESS.call{ value: recoverAmt }("");
        require(success, "Transfer failed");
    }
}
