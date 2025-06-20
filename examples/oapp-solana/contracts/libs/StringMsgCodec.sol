// SPDX-License-Identifier: MIT

pragma solidity ^0.8.22;

error MsgTooShort();
error InvalidStringValueLength();

library StringMsgCodec {
    uint8 public constant VANILLA_TYPE = 1;

    /// @notice Reconstructs `stringValue` from `_msg`.
    function decode(bytes calldata _msg) internal pure returns (string memory stringValue) {
        if (_msg.length < 32) revert MsgTooShort();

        // 1) Grab the first 32 bytes and ABI-decode as uint256, then cast down to u32
        uint256 lenRaw = abi.decode(_msg[:32], (uint256));
        uint32 strLen = uint32(lenRaw);
        uint256 N = uint256(strLen);

        // 2) Bounds check
        if (_msg.length < 32 + N) revert InvalidStringValueLength();

        // 3) Extract the UTF-8 string
        stringValue = string(_msg[32:32 + N]);

        // 4) Anything after that is ignored
    }
}
