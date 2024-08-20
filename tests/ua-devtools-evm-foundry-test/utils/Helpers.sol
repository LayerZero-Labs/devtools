// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

library Helpers {
    // TODO add nat spec
    function sortAddresses(address[] memory arr) internal pure returns (address[] memory) {
        uint256 length = arr.length;
        for (uint256 i = 0; i < length; i++) {
            for (uint256 j = 0; j < length - 1; j++) {
                if (arr[j] > arr[j + 1]) {
                    // Swap elements if they are in the wrong order
                    address temp = arr[j];
                    arr[j] = arr[j + 1];
                    arr[j + 1] = temp;
                }
            }
        }
        return arr;
    }

    // Helper function to check if the array is sorted and unique
    function isSortedAndUnique(address[] memory arr) internal pure returns (bool) {
        if (arr.length < 2) return true; // Arrays of length 0 or 1 are trivially sorted and unique

        for (uint256 i = 1; i < arr.length; i++) {
            if (arr[i] <= arr[i - 1]) {
                return false;
            }
        }
        return true;
    }
}
