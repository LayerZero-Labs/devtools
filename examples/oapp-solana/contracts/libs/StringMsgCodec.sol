// SPDX-License-Identifier: MIT

pragma solidity ^0.8.22;

library StringMsgCodec {
    uint8 public constant VANILLA_TYPE = 1;
    uint8 public constant COMPOSED_TYPE = 2;

    /// @notice Reconstructs `(stringValue, composeMsg)` from `_msg`.
    function decode(bytes calldata _msg) internal pure returns (string memory stringValue, bytes memory composeMsg) {
        require(_msg.length >= 32, "msg too short");

        // 1) Grab the first 32 bytes and ABI-decode as uint256, then cast down to u32
        uint256 lenRaw = abi.decode(_msg[:32], (uint256));
        uint32 strLen = uint32(lenRaw);
        uint256 N = uint256(strLen);

        // 2) Bounds check
        require(_msg.length >= 32 + N, "invalid stringValue length");

        // 3) Extract the UTF-8 string
        stringValue = string(_msg[32:32 + N]);

        // 4) Anything after that is `composeMsg`
        if (_msg.length > 32 + N) {
            composeMsg = _msg[32 + N:];
        } else {
            composeMsg = "";
        }
    }

    /**
     * @dev Checks if the _msg is composed.
     * @param _msg The _msg.
     * @return A boolean indicating whether the _msg is composed.
     */
    function isComposed(bytes calldata _msg) internal pure returns (bool) {
        (, bytes memory composeMsg) = decode(_msg);
        return composeMsg.length > 0;
    }
}
