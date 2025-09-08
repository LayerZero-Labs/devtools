// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRecoverable Composer Interface
 * @author LayerZero Labs
 * @notice Interface for emergency recovery functionality in HyperLiquid Composer
 * @dev Defines the public API for recovery mechanisms for both HyperEVM and HyperCore assets
 */
interface IRecoverableComposer {
    error MaxRetrieveAmountExceeded(uint256 maxAmount, uint256 requestedAmount);
    error NotRecoveryAddress();
    error TransferFailed();

    /// @dev Retrieved is the process of moving tokens at the composer from HyperCore to HyperEVM
    event Retrieved(uint64 indexed coreIndexId, uint256 amount, address indexed to);
    /// @dev Recovery is the process of pulling tokens from the composer on hyperevm to the recovery address
    event Recovered(address indexed to, uint256 amount);

    /**
     * @notice Constant indicating a full transfer of available balance
     * @return The constant value (0) representing full transfer
     */
    function FULL_TRANSFER() external view returns (uint256);

    /**
     * @notice Core index ID for USDC on HyperLiquid
     * @return The USDC core index ID
     */
    function USDC_CORE_INDEX() external view returns (uint64);

    /**
     * @notice Address authorized to perform recovery operations
     * @return The recovery address
     */
    function RECOVERY_ADDRESS() external view returns (address);

    /**
     * @notice Retrieves ERC20 tokens from HyperCore back to the asset bridge address
     * @dev Transfers tokens from the composer's HyperCore balance to the OFT asset bridge
     * @dev Can only be called by the recovery address
     * @param _coreAmount Amount of tokens to retrieve in HyperCore decimals, or FULL_TRANSFER for all
     */
    function retrieveCoreERC20(uint64 _coreAmount) external;

    /**
     * @notice Retrieves HYPE tokens from HyperCore back to the HYPE asset bridge address
     * @dev Transfers HYPE tokens from the composer's HyperCore balance to the HYPE asset bridge
     * @dev Can only be called by the recovery address
     * @param _coreAmount Amount of HYPE tokens to retrieve in HyperCore decimals, or FULL_TRANSFER for all
     */
    function retrieveCoreHYPE(uint64 _coreAmount) external;

    /**
     * @notice Retrieves USDC tokens from HyperCore to a specified address
     * @dev Transfers USDC tokens from the composer's HyperCore balance to the specified address
     * @dev Can only be called by the recovery address
     * @param _coreAmount Amount of USDC tokens to retrieve in HyperCore decimals, or FULL_TRANSFER for all
     * @param _to Destination address to receive the retrieved USDC tokens
     */
    function retrieveCoreUSDC(uint64 _coreAmount, address _to) external;

    /**
     * @notice Recovers ERC20 tokens from HyperEVM to the recovery address
     * @dev Convenience function that recovers tokens to the recovery address
     * @dev Can only be called by the recovery address
     * @param _evmAmount Amount of ERC20 tokens to recover in EVM decimals, or FULL_TRANSFER for all
     */
    function recoverEvmERC20(uint256 _evmAmount) external;

    /**
     * @notice Recovers native tokens from HyperEVM to the recovery address
     * @dev Convenience function that recovers native tokens to the recovery address
     * @dev Can only be called by the recovery address
     * @param _evmAmount Amount of native tokens to recover in wei, or FULL_TRANSFER for all
     */
    function recoverEvmNative(uint256 _evmAmount) external;
}
