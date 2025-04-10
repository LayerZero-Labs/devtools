// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

/**
 * @title OnlyLZAdmin
 * @dev Abstract contract that restricts access of functions to only the LayerZero admin.
 * @dev The contract implementer is responsible for deciding how that role is defined and managed.
 */
abstract contract OnlyLZAdmin {
    /**
     * @dev Modifier to restrict access to only the LayerZero admin.
     */
    modifier onlyLZAdmin() virtual;
}
