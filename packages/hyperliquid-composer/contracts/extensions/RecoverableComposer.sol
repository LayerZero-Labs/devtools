// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { IOFT } from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import { ICoreWriter } from "../interfaces/ICoreWriter.sol";
import { IRecoverableComposer } from "../interfaces/IRecoverableComposer.sol";

import { HyperLiquidComposerCodec } from "../library/HyperLiquidComposerCodec.sol";
import { HyperLiquidComposer } from "../HyperLiquidComposer.sol";

/**
 * @title Recoverable Composer
 * @author LayerZero Labs (@shankars99)
 * @notice Extension contract providing emergency recovery functionality for HyperLiquid Composer
 * @dev Abstract contract that adds recovery mechanisms for both HyperEVM and HyperCore assets
 * @dev Allows authorized recovery of stuck tokens from both EVM side and Core side of the bridge
 * @dev Should be inherited by HyperLiquidComposer implementations that require emergency recovery
 */
abstract contract RecoverableComposer is HyperLiquidComposer, IRecoverableComposer {
    using SafeERC20 for IERC20;
    using HyperLiquidComposerCodec for uint64;

    /**
     * @notice Restricts access to recovery operations to the designated recovery address
     * @dev Ensures only authorized personnel can perform emergency recovery operations
     */
    modifier onlyRecoveryAddress() {
        if (msg.sender != RECOVERY_ADDRESS) revert NotRecoveryAddress();
        _;
    }

    /// @notice Constant indicating a full transfer of available balance
    uint256 public constant FULL_TRANSFER = 0;

    /// @notice Core index ID for USDC on HyperLiquid
    uint64 public constant USDC_CORE_INDEX = 0;

    /// @notice Address authorized to perform recovery operations
    address public immutable RECOVERY_ADDRESS;

    /**
     * @notice Constructor for RecoverableComposer
     * @param _recoveryAddress Address that will be authorized to perform recovery operations
     */
    constructor(address _recoveryAddress) {
        RECOVERY_ADDRESS = _recoveryAddress;
    }

    /**
     * @notice Retrieves ERC20 tokens from HyperCore back to the asset bridge address
     * @dev Transfers tokens from the composer's HyperCore balance to the OFT asset bridge
     * @dev Can only be called by the recovery address
     * @param _coreAmount Amount of tokens to retrieve in HyperCore decimals, or FULL_TRANSFER for all
     */
    function retrieveCoreERC20(uint64 _coreAmount) public onlyRecoveryAddress {
        uint64 maxTransferAmt = _getMaxTransferAmount(ERC20_CORE_INDEX_ID, _coreAmount);

        _submitCoreWriterTransfer(ERC20_ASSET_BRIDGE, ERC20_CORE_INDEX_ID, maxTransferAmt);
        emit Retrieved(ERC20_CORE_INDEX_ID, maxTransferAmt, ERC20_ASSET_BRIDGE);
    }

    /**
     * @notice Retrieves HYPE tokens from HyperCore back to the HYPE asset bridge address
     * @dev Transfers HYPE tokens from the composer's HyperCore balance to the HYPE asset bridge
     * @dev Can only be called by the recovery address
     * @param _coreAmount Amount of HYPE tokens to retrieve in HyperCore decimals, or FULL_TRANSFER for all
     */
    function retrieveCoreHYPE(uint64 _coreAmount) public onlyRecoveryAddress {
        uint64 maxTransferAmt = _getMaxTransferAmount(NATIVE_CORE_INDEX_ID, _coreAmount);

        _submitCoreWriterTransfer(NATIVE_ASSET_BRIDGE, NATIVE_CORE_INDEX_ID, maxTransferAmt);
        emit Retrieved(NATIVE_CORE_INDEX_ID, maxTransferAmt, NATIVE_ASSET_BRIDGE);
    }

    /**
     * @notice Retrieves USDC tokens from HyperCore to a specified address
     * @dev Transfers USDC tokens from the composer's HyperCore balance to the specified address
     * @dev Can only be called by the recovery address
     * @param _coreAmount Amount of USDC tokens to retrieve in HyperCore decimals, or FULL_TRANSFER for all
     * @param _to Destination address to receive the retrieved USDC tokens
     */
    function retrieveCoreUSDC(uint64 _coreAmount, address _to) public virtual onlyRecoveryAddress {
        uint64 maxTransferAmt = _getMaxTransferAmount(USDC_CORE_INDEX, _coreAmount);

        _submitCoreWriterTransfer(_to, USDC_CORE_INDEX, maxTransferAmt);
        emit Retrieved(USDC_CORE_INDEX, maxTransferAmt, _to);
    }

    /**
     * @notice Recovers ERC20 tokens from HyperEVM to the recovery address
     * @dev Convenience function that recovers tokens to the recovery address
     * @dev Can only be called by the recovery address
     * @param _evmAmount Amount of ERC20 tokens to recover in EVM decimals, or FULL_TRANSFER for all
     */
    function recoverEvmERC20(uint256 _evmAmount) public onlyRecoveryAddress {
        uint256 recoverAmt = _evmAmount == FULL_TRANSFER ? IERC20(ERC20).balanceOf(address(this)) : _evmAmount;

        IERC20(ERC20).safeTransfer(RECOVERY_ADDRESS, recoverAmt);
        emit Recovered(RECOVERY_ADDRESS, recoverAmt);
    }

    /**
     * @notice Recovers native tokens from HyperEVM to the recovery address
     * @dev Convenience function that recovers native tokens to the recovery address
     * @dev Can only be called by the recovery address
     * @param _evmAmount Amount of native tokens to recover in wei, or FULL_TRANSFER for all
     */
    function recoverEvmNative(uint256 _evmAmount) public onlyRecoveryAddress {
        uint256 recoverAmt = _evmAmount == FULL_TRANSFER ? address(this).balance : _evmAmount;

        (bool success, ) = RECOVERY_ADDRESS.call{ value: recoverAmt }("");
        if (!success) revert TransferFailed();
        emit Recovered(RECOVERY_ADDRESS, recoverAmt);
    }

    /**
     * @notice Internal function to calculate the maximum transferable amount
     * @dev Validates that the requested amount doesn't exceed available balance
     * @param _coreIndexId The core index ID of the token to check
     * @param _coreAmount The requested amount to transfer, or FULL_TRANSFER for all available
     * @return The actual amount that can be transferred
     */
    function _getMaxTransferAmount(uint64 _coreIndexId, uint64 _coreAmount) internal view returns (uint64) {
        uint64 maxTransferAmt = spotBalance(address(this), _coreIndexId).total;
        if (_coreAmount > maxTransferAmt) {
            revert MaxRetrieveAmountExceeded(maxTransferAmt, _coreAmount);
        }
        return _coreAmount == FULL_TRANSFER ? maxTransferAmt : _coreAmount;
    }
}
