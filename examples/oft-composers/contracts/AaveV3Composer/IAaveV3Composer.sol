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
    /// ========================== Error Messages =====================================
    error InvalidAavePool();
    error InvalidStargatePool();
    error OnlyValidComposerCaller(address sender);
    error OnlyEndpoint(address endpoint);
    error OnlySelf(address caller);

    /// ========================== EVENTS =====================================
    event Sent(bytes32 guid);
    event Refunded(bytes32 guid);
    event Supplied(address indexed recipient, uint256 amountLd);
    event SupplyFailedAndRefunded(address indexed recipient, uint256 amountLd);
}
