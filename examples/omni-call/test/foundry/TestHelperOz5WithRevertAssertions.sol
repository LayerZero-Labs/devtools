// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import { TestHelperOz5, DoubleEndedQueue, ExecutorOptions, PacketV1Codec, console } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";

contract TestHelperOz5WithRevertAssertions is TestHelperOz5 {
    using DoubleEndedQueue for DoubleEndedQueue.Bytes32Deque;
    using PacketV1Codec for bytes;

    function verifyPacketsWithReceiveRevertAssertion(
        uint32 _dstEid,
        bytes32 _dstAddress,
        bytes memory _receiveRevertAssertion
    ) public {
        verifyPacketsWithRevertAssertion(_dstEid, _dstAddress, _receiveRevertAssertion, bytes(""), bytes(""));
    }

    function verifyPacketsWithReadRevertAssertion(
        uint32 _dstEid,
        bytes32 _dstAddress,
        bytes memory _readRevertAssertion
    ) public {
        verifyPacketsWithRevertAssertion(_dstEid, _dstAddress, bytes(""), _readRevertAssertion, bytes(""));
    }

    function verifyPacketsWithComposeRevertAssertion(
        uint32 _dstEid,
        bytes32 _dstAddress,
        bytes memory _composeRevertAssertion
    ) public {
        verifyPacketsWithRevertAssertion(_dstEid, _dstAddress, bytes(""), bytes(""), _composeRevertAssertion);
    }

    /**
     * @notice Verifies and processes packets destined for a specific chain and user address.
     * @dev Calls an overloaded version of verifyPackets with default values for packet amount and composer address.
     * @param _dstEid The destination chain's endpoint ID.
     * @param _dstAddress The destination address in bytes32 format.
     */
    function verifyPacketsWithRevertAssertion(
        uint32 _dstEid,
        bytes32 _dstAddress,
        bytes memory _receiveRevertAssertion,
        bytes memory _readRevertAssertion,
        bytes memory _composeRevertAssertion
    ) public {
        verifyPacketsWithRevertAssertion(
            _dstEid,
            _dstAddress,
            0,
            address(0x0),
            bytes(""),
            _receiveRevertAssertion,
            _readRevertAssertion,
            _composeRevertAssertion
        );
    }

    function verifyPacketsWithRevertAssertion(
        uint32 _dstEid,
        bytes32 _dstAddress,
        uint256 _packetAmount,
        address _composer,
        bytes memory _resolvedPayload,
        bytes memory _receiveRevertAssertion,
        bytes memory _readRevertAssertion,
        bytes memory _composeRevertAssertion
    ) public {
        require(endpoints[_dstEid] != address(0), "endpoint not yet registered");

        DoubleEndedQueue.Bytes32Deque storage queue = packetsQueue[_dstEid][_dstAddress];
        uint256 pendingPacketsSize = queue.length();
        uint256 numberOfPackets;
        if (_packetAmount == 0) {
            numberOfPackets = queue.length();
        } else {
            numberOfPackets = pendingPacketsSize > _packetAmount ? _packetAmount : pendingPacketsSize;
        }
        while (numberOfPackets > 0) {
            numberOfPackets--;
            // front in, back out
            bytes32 guid = queue.popBack();
            bytes memory packetBytes = packets[guid];
            this.assertGuid(packetBytes, guid);
            this.validatePacket(packetBytes, _resolvedPayload);

            bytes memory options = optionsLookup[guid];
            if (_executorOptionExists(options, ExecutorOptions.OPTION_TYPE_NATIVE_DROP)) {
                (uint256 amount, bytes32 receiver) = _parseExecutorNativeDropOption(options);
                address to = address(uint160(uint256(receiver)));
                (bool sent, ) = to.call{ value: amount }("");
                require(sent, "Failed to send Ether");
            }
            if (_executorOptionExists(options, ExecutorOptions.OPTION_TYPE_LZRECEIVE)) {
                if (_receiveRevertAssertion.length > 0) {
                    if (keccak256(_receiveRevertAssertion) == keccak256(bytes("EvmError"))) {
                        vm.expectRevert();
                    } else {
                        vm.expectRevert(_receiveRevertAssertion);
                    }
                }
                this.lzReceive(packetBytes, options);
            }
            if (_executorOptionExists(options, ExecutorOptions.OPTION_TYPE_LZREAD)) {
                if (_readRevertAssertion.length > 0) {
                    vm.expectRevert(_readRevertAssertion);
                }
                this.lzReadReceive(packetBytes, options, _resolvedPayload);
            }
            if (_composer != address(0) && _executorOptionExists(options, ExecutorOptions.OPTION_TYPE_LZCOMPOSE)) {
                if (_composeRevertAssertion.length > 0) {
                    vm.expectRevert(_composeRevertAssertion);
                }
                this.lzCompose(packetBytes, options, guid, _composer);
            }
        }
    }
}
