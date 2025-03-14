// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

// Oz
import { DoubleEndedQueue } from "@openzeppelin/contracts/utils/structs/DoubleEndedQueue.sol";

// Msg Lib
import { UlnConfig } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/UlnBase.sol";
import { ExecutorOptions } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/libs/ExecutorOptions.sol";

// Protocol
import { IMessageLib } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/IMessageLib.sol";
import { PacketV1Codec } from "@layerzerolabs/lz-evm-protocol-v2/contracts/messagelib/libs/PacketV1Codec.sol";

// @dev oz4/5 breaking change...
import { ReceiveUln302Mock as ReceiveUln302, IReceiveUlnE2 } from "./mocks/ReceiveUln302Mock.sol";
import { DVNMock as DVN, ExecuteParam } from "./mocks/DVNMock.sol";
import { ExecutorMock as Executor } from "./mocks/ExecutorMock.sol";
import { EndpointV2Mock as EndpointV2 } from "./mocks/EndpointV2Mock.sol";

// Misc. Mocks
import { SimpleMessageLibMock } from "./mocks/SimpleMessageLibMock.sol";
import { TestHelperOz5 } from "./TestHelperOz5.sol";

contract TestHelperOz5WithRevertAssertions is TestHelperOz5 {
    using DoubleEndedQueue for DoubleEndedQueue.Bytes32Deque;
    using PacketV1Codec for bytes;

    /**
     * @notice Verifies and executes packets destined for a specific chain and user address.
     * @dev Calls an overloaded version of verifyAndExecutePackets with default values for packet amount and composer address.
     * @param _dstEid The destination chain's endpoint ID.
     * @param _dstAddress The destination address in bytes32 format.
     */
    function verifyAndExecutePackets(uint32 _dstEid, bytes32 _dstAddress) public {
        verifyAndExecutePackets(_dstEid, _dstAddress, 0, address(0x0), "", "", bytes4(0), bytes4(0));
    }

    /**
     * @dev verify and execute packets to destination chain's OApp address.
     * @param _dstEid The destination endpoint ID.
     * @param _dstAddress The destination address.
     */
    function verifyAndExecutePackets(uint32 _dstEid, address _dstAddress) public {
        verifyAndExecutePackets(_dstEid, bytes32(uint256(uint160(_dstAddress))), 0, address(0x0), "", "", bytes4(0), bytes4(0));
    }

    /**
    * @dev verify and execute packets to destination chain's OApp address.
     * @param _dstEid The destination endpoint ID.
     * @param _dstAddress The destination address.
     * @param _packetAmount Amount of packets to process.
     * @param _composer The lzCompose composer address.
     */
    function verifyAndExecutePackets(uint32 _dstEid, bytes32 _dstAddress, uint256 _packetAmount, address _composer) public {
        verifyAndExecutePackets(_dstEid, _dstAddress, _packetAmount, _composer, "", "", bytes4(0), bytes4(0));
    }

    /**
     * @dev verify and execute packets to destination chain's OApp address.
     * @param _dstEid The destination endpoint ID.
     * @param _dstAddress The destination address.
     * @param _packetAmount Amount of packets to process.
     * @param _composer The lzCompose composer address.
     * @param _expectedReceiveRevertData Expected revert data for lzReceive.
     * @param _expectedComposeRevertData Expected revert data for lzCompose.
     */
    function verifyAndExecutePackets(
        uint32 _dstEid,
        bytes32 _dstAddress,
        uint256 _packetAmount,
        address _composer,
        bytes memory _expectedReceiveRevertData,
        bytes memory _expectedComposeRevertData
    ) public {
        verifyAndExecutePackets(_dstEid, _dstAddress, _packetAmount, _composer, _expectedReceiveRevertData, _expectedComposeRevertData, bytes4(0), bytes4(0));
    }

    /**
     * @dev verify and execute packets to destination chain's OApp address.
     * @param _dstEid The destination endpoint ID.
     * @param _dstAddress The destination address.
     * @param _packetAmount Amount of packets to process.
     * @param _composer The lzCompose composer address.
     * @param _expectedReceiveRevertData Expected revert data for lzReceive.
     * @param _expectedComposeRevertData Expected revert data for lzCompose.
     */
    function verifyAndExecutePackets(
        uint32 _dstEid,
        bytes32 _dstAddress,
        uint256 _packetAmount,
        address _composer,
        bytes4 _expectedReceiveRevertData,
        bytes4 _expectedComposeRevertData
    ) public {
        verifyAndExecutePackets(_dstEid, _dstAddress, _packetAmount, _composer, "", "", _expectedReceiveRevertData, _expectedComposeRevertData);
    }

    /**
     * @dev verify and execute packets to destination chain's OApp address.
     * @param _dstEid The destination endpoint ID.
     * @param _dstAddress The destination address.
     * @param _packetAmount Amount of packets to process.
     * @param _composer The lzCompose composer address.
     * @param _expectedReceiveRevertData Expected revert data for lzReceive in bytes.
     * @param _expectedComposeRevertData Expected revert data for lzCompose in bytes.
     * @param _expectedReceiveRevertData4 Expected revert data for lzReceive in bytes4.
     * @param _expectedComposeRevertData4 Expected revert data for lzCompose in bytes4.
     */
    function verifyAndExecutePackets(
        uint32 _dstEid,
        bytes32 _dstAddress,
        uint256 _packetAmount,
        address _composer,
        bytes memory _expectedReceiveRevertData,
        bytes memory _expectedComposeRevertData,
        bytes4 _expectedReceiveRevertData4,
        bytes4 _expectedComposeRevertData4
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
            this.validatePacket(packetBytes);

            bytes memory options = optionsLookup[guid];
            if (_executorOptionExists(options, ExecutorOptions.OPTION_TYPE_NATIVE_DROP)) {
                (uint256 amount, bytes32 receiver) = _parseExecutorNativeDropOption(options);
                address to = address(uint160(uint256(receiver)));
                (bool sent, ) = to.call{ value: amount }("");
                require(sent, "Failed to send Ether");
            }
            if (_executorOptionExists(options, ExecutorOptions.OPTION_TYPE_LZRECEIVE)) {
                if (_expectedReceiveRevertData.length != 0) {
                    queue.pushBack(guid);
                    vm.expectRevert(_expectedReceiveRevertData);
                } else if (_expectedReceiveRevertData4 != bytes4(0)) {
                    queue.pushBack(guid);
                    vm.expectRevert(_expectedReceiveRevertData4);
                }

                this.lzReceive(packetBytes, options);
            }
            if (_composer != address(0) && _executorOptionExists(options, ExecutorOptions.OPTION_TYPE_LZCOMPOSE)) {
                if (_expectedComposeRevertData.length != 0) {
                    queue.pushBack(guid);
                    vm.expectRevert(_expectedComposeRevertData);
                } else if (_expectedComposeRevertData4 != bytes4(0)) {
                    queue.pushBack(guid);
                    vm.expectRevert(_expectedComposeRevertData4);
                }
                this.lzCompose(packetBytes, options, guid, _composer);
            }
        }
    }

    function validatePacket(bytes calldata _packetBytes) external {
        uint32 dstEid = _packetBytes.dstEid();
        EndpointV2 endpoint = EndpointV2(endpoints[dstEid]);
        (address receiveLib, ) = endpoint.getReceiveLibrary(_packetBytes.receiverB20(), _packetBytes.srcEid());
        ReceiveUln302 dstUln = ReceiveUln302(receiveLib);

        (uint64 major, , ) = IMessageLib(receiveLib).version();
        if (major == 3) {
            // it is ultra light node
            bytes memory config = dstUln.getConfig(_packetBytes.srcEid(), _packetBytes.receiverB20(), 2); // CONFIG_TYPE_ULN
            DVN dvn = DVN(abi.decode(config, (UlnConfig)).requiredDVNs[0]);

            bytes memory packetHeader = _packetBytes.header();
            bytes32 payloadHash = keccak256(_packetBytes.payload());

            // sign
            bytes memory signatures;
            bytes memory verifyCalldata = abi.encodeWithSelector(
                IReceiveUlnE2.verify.selector,
                packetHeader,
                payloadHash,
                100
            );
            {
                bytes32 hash = dvn.hashCallData(dstEid, address(dstUln), verifyCalldata, block.timestamp + 1000);
                bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
                (uint8 v, bytes32 r, bytes32 s) = vm.sign(1, ethSignedMessageHash); // matches dvn signer
                signatures = abi.encodePacked(r, s, v);
            }
            ExecuteParam[] memory params = new ExecuteParam[](1);
            params[0] = ExecuteParam(dstEid, address(dstUln), verifyCalldata, block.timestamp + 1000, signatures);
            dvn.execute(params);

            // commit verification
            bytes memory callData = abi.encodeWithSelector(
                IReceiveUlnE2.commitVerification.selector,
                packetHeader,
                payloadHash
            );
            {
                bytes32 hash = dvn.hashCallData(dstEid, address(dstUln), callData, block.timestamp + 1000);
                bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
                (uint8 v, bytes32 r, bytes32 s) = vm.sign(1, ethSignedMessageHash); // matches dvn signer
                signatures = abi.encodePacked(r, s, v);
            }
            params[0] = ExecuteParam(dstEid, address(dstUln), callData, block.timestamp + 1000, signatures);
            dvn.execute(params);
        } else {
            SimpleMessageLibMock(payable(receiveLib)).validatePacket(_packetBytes);
        }
    }
}