// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

library ONFT1155MsgCodec {
    uint8 private constant NUM_BYTES_FOR_UINT256 = 32;
    uint8 private constant SEND_TO_OFFSET = 32;
    uint8 private constant NUM_TOKENS_OFFSET = 64; // 32 + 32

    function encode(
        bytes32 _sendTo,
        uint256[] memory _tokenIds,
        uint256[] memory _amounts,
        bytes memory _composeMsg
    ) internal pure returns (bytes memory _msg, bool hasCompose) {
        hasCompose = _composeMsg.length > 0;
        // this cast is considered safe due to ONFTInvalidBatchSize check in ONFT721Core
        _msg = hasCompose
            ? abi.encodePacked(_sendTo, _tokenIds.length, _tokenIds, _amounts, _composeMsg)
            : abi.encodePacked(_sendTo, _tokenIds.length, _tokenIds, _amounts);
    }

    function sendTo(bytes calldata _msg) internal pure returns (bytes32) {
        return bytes32(_msg[:SEND_TO_OFFSET]);
    }

    function numTokens(bytes memory _msg) internal pure returns (uint256 parsedNumTokens) {
        assembly {
            parsedNumTokens := mload(add(add(_msg, SEND_TO_OFFSET), NUM_BYTES_FOR_UINT256))
        }
    }

    function tokens(bytes calldata _msg) internal pure returns (uint256[] memory tokenIds, uint256[] memory amounts) {
        uint256 numOfTokens = numTokens(_msg);

        tokenIds = new uint256[](numOfTokens);
        amounts = new uint256[](numOfTokens);
        unchecked {
            for (uint256 i = 0; i < numOfTokens; i++) {
                tokenIds[i] = abi.decode(
                    _msg[NUM_TOKENS_OFFSET + i * NUM_BYTES_FOR_UINT256:NUM_TOKENS_OFFSET +
                        i *
                        NUM_BYTES_FOR_UINT256 +
                        NUM_BYTES_FOR_UINT256],
                    (uint256)
                );
                amounts[i] = abi.decode(
                    _msg[NUM_TOKENS_OFFSET +
                        numOfTokens *
                        NUM_BYTES_FOR_UINT256 +
                        i *
                        NUM_BYTES_FOR_UINT256:NUM_TOKENS_OFFSET +
                        numOfTokens *
                        NUM_BYTES_FOR_UINT256 +
                        i *
                        NUM_BYTES_FOR_UINT256 +
                        NUM_BYTES_FOR_UINT256],
                    (uint256)
                );
            }
        }
    }

    function isComposed(bytes calldata _msg) internal pure returns (bool) {
        return _msg.length > numTokens(_msg) * NUM_BYTES_FOR_UINT256 + NUM_TOKENS_OFFSET;
    }

    function composeMsg(bytes calldata _msg) internal pure returns (bytes memory) {
        uint256 numOfTokens = numTokens(_msg);
        return _msg[NUM_TOKENS_OFFSET + NUM_BYTES_FOR_UINT256 * numOfTokens:];
    }

    /// @dev Converts an address to bytes32.
    /// @param _addr The address to convert.
    /// @return The bytes32 representation of the address.
    function addressToBytes32(address _addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(_addr)));
    }

    /// @dev Converts bytes32 to an address.
    /// @param _b The bytes32 value to convert.
    /// @return The address representation of bytes32.
    function bytes32ToAddress(bytes32 _b) internal pure returns (address) {
        return address(uint160(uint256(_b)));
    }
}
