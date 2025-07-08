// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

library Base58Decoder {
    // Base58 characters
    bytes constant BASE58_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

    // Base58 decoding function
    function base58ToHex(string memory base58) internal pure returns (bytes memory) {
        bytes memory input = bytes(base58);
        uint256[] memory digits = new uint256[](input.length);
        uint256 digitCount = 0;

        // Convert Base58 characters to their corresponding values
        for (uint256 i = 0; i < input.length; i++) {
            bytes1 char = input[i];
            uint256 value = indexOf(BASE58_CHARS, char);
            require(value != type(uint256).max, "Invalid Base58 character");
            digits[digitCount++] = value;
        }

        // Convert Base58 digits to bytes
        bytes memory output = new bytes(input.length);
        uint256 outputIndex = 0;
        uint256 carry;

        for (uint256 i = 0; i < digitCount; i++) {
            carry = digits[i];
            for (uint256 j = 0; j < outputIndex; j++) {
                carry += uint256(uint8(output[j])) * 58;
                output[j] = bytes1(uint8(carry % 256));
                carry /= 256;
            }
            while (carry > 0) {
                output[outputIndex++] = bytes1(uint8(carry % 256));
                carry /= 256;
            }
        }

        // Handle leading zeros
        for (uint256 i = 0; i < input.length && input[i] == BASE58_CHARS[0]; i++) {
            output[outputIndex++] = 0;
        }

        // Reverse the output to get the correct byte order
        bytes memory reversedOutput = new bytes(outputIndex);
        for (uint256 i = 0; i < outputIndex; i++) {
            reversedOutput[i] = output[outputIndex - 1 - i];
        }

        return reversedOutput;
    }

    // Helper function to find the index of a character in a bytes array
    function indexOf(bytes memory str, bytes1 char) internal pure returns (uint256) {
        for (uint256 i = 0; i < str.length; i++) {
            if (str[i] == char) {
                return i;
            }
        }
        return type(uint256).max;
    }
}
