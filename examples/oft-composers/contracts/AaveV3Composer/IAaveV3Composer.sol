// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IAaveV3Composer
 *
 * @notice Interface defining events and errors for the AaveV3Composer contract.
 *
 * @dev This interface helps with code organization, testing, and reusability by separating
 * contract definitions from implementation logic.
 */
interface IAaveV3Composer {
    /// @notice Custom errors for more gas-efficient reverts.
    error InvalidAavePool();
    error InvalidStargatePool();
    error UnauthorizedStargatePool();
    error UnauthorizedEndpoint();

    /**
     * @notice Emitted when a token supply is successfully executed.
     *
     * @param recipient The address of the recipient of the aTokens tokens.
     * @param amountLD The amount of LD tokens being supplied.
     */
    event SupplyExecuted(
        address indexed recipient,
        uint256 amountLD
    );

    /**
     * @notice Emitted when a token supply fails and the OFT tokens are refunded to the recipient.
     *
     * @param recipient The address of the recipient of the aTokens tokens.
     * @param amountLD The amount of LD tokens being refunded.
     */
    event SupplyFailedAndRefunded(address indexed recipient, uint256 amountLD);
}   
