// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

library Helpers {
    // Validate that the required DVNs are sorted in strictly ascending order, contain no duplicates, and are not address(0)
    function validateRequiredDvns(address[] memory arr) internal pure returns (bool) {
        if (arr.length < 2) return arr.length == 0 || arr[0] != address(0); // Handle arrays of length 0 or 1

        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == address(0)) {
                return false; // Contains a zero address
            }

            if (i > 0 && arr[i] <= arr[i - 1]) {
                return false; // Not sorted in strictly ascending order or contains duplicates
            }
        }
        return true;
    }
}
