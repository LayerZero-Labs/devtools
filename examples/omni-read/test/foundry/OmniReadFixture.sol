// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

/// -----------------------------------------------------------------------
/// Imports
/// -----------------------------------------------------------------------

import { OmniRead, Origin, MessagingFee, MessagingReceipt } from "../../contracts/OmniRead.sol";

/// -----------------------------------------------------------------------
/// Fixture
/// -----------------------------------------------------------------------

/**
 * @title OmniReadFixture
 * @notice A fixture for the OmniRead contract.
 */
contract OmniReadFixture is OmniRead {
    constructor(address _endpoint, address _delegate) OmniRead(_endpoint, _delegate) {}

    function lzReceiveInternal(
        Origin calldata _origin,
        bytes32 guid,
        bytes calldata payload,
        address _executor,
        bytes calldata _extraData
    ) external {
        _lzReceive(_origin, guid, payload, _executor, _extraData);
    }

    function readInternal(
        OmniReadRequest[] memory readRequests,
        uint128 readGasLimit,
        uint32 returnDataSize,
        uint128 msgValue,
        bytes32 identifier
    ) external payable returns (MessagingReceipt memory receipt) {
        return _read(readRequests, readGasLimit, returnDataSize, msgValue, identifier);
    }

    function buildCmdInternal(OmniReadRequest[] memory readRequests) external pure returns (bytes memory) {
        return _buildCmd(readRequests);
    }

    function quoteWithOptionsInternal(
        OmniReadRequest[] memory readRequests,
        uint128 readGasLimit,
        uint32 returnDataSize,
        uint128 msgValue
    ) external view returns (MessagingFee memory fee, bytes memory options, bytes memory payload) {
        return _quoteWithOptions(readRequests, readGasLimit, returnDataSize, msgValue);
    }
}
