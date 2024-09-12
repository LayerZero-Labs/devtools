// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

library Helpers {

    function convertToAddresses(uint8[] memory numbers) public pure returns (address[] memory) {
        address[] memory addresses = new address[](numbers.length);
        uint160 cumulativeSum = 0;

        for (uint i = 0; i < numbers.length; i++) {
            // Treat 0 as 1
            uint8 currentNumber = numbers[i] == 0 ? 1 : numbers[i];
            
            // Add to cumulative sum
            cumulativeSum += currentNumber;
            
            // Convert cumulative sum to address
            addresses[i] = address(cumulativeSum);
        }
        
        return addresses;
    }
}
