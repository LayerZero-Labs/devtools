// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import { SimpleDVNMock } from "../../contracts/mocks/SimpleDVNMock.sol";
import { IReceiveUlnE2 } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/interfaces/IReceiveUlnE2.sol";
import { ILayerZeroDVN } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/interfaces/ILayerZeroDVN.sol";


// Minimal mock for IReceiveUlnE2
contract MockReceiveUln is IReceiveUlnE2 {
    bool public verifyCalled;
    bool public commitCalled;

    function verify(bytes calldata, bytes32, uint64) external override {
        verifyCalled = true;
    }

    function commitVerification(bytes calldata, bytes32) external override {
        commitCalled = true;
    }
}

contract SimpleDVNMockTest is Test {
    SimpleDVNMock public dvnMock;
    MockReceiveUln public mockReceiveUln;

    address public owner;
    uint32 public constant LOCAL_EID = 40161;
    uint32 public constant REMOTE_EID = 11155420;

    bytes public constant SAMPLE_MESSAGE = hex"1234567890abcdef";
    uint64 public constant SAMPLE_NONCE = 12345;
    bytes32 public constant REMOTE_OAPP = 0x1234567890123456789012345678901234567890123456789012345678901234;
    address public constant LOCAL_OAPP = 0xABcdEFABcdEFabcdEfAbCdefabcdeFABcDEFabCD;

    event PayloadVerified(bytes32 indexed guid);
    event PayloadCommitted(bytes32 indexed guid);

    function setUp() public {
        owner = makeAddr("owner");
        mockReceiveUln = new MockReceiveUln();

        vm.prank(owner);
        dvnMock = new SimpleDVNMock(address(mockReceiveUln), LOCAL_EID);
    }

    // Test custom initialization logic
    function test_constructor() public view {
        assertEq(address(dvnMock.receiveUln()), address(mockReceiveUln));
        assertEq(dvnMock.localEid(), LOCAL_EID);
        assertEq(dvnMock.owner(), owner);
        assertEq(dvnMock.PACKET_VERSION(), 1);
    }

    // Test interface compliance - getFee should return 0
    function test_getFee_returnsZero() public view {
        uint256 fee = dvnMock.getFee(REMOTE_EID, 1, address(0x123), hex"1234");
        assertEq(fee, 0);
    }

    // Test interface compliance - assignJob should return 0
    function test_assignJob_returnsZero() public {
        ILayerZeroDVN.AssignJobParam memory param = ILayerZeroDVN.AssignJobParam({
            dstEid: REMOTE_EID,
            packetHeader: hex"1234",
            payloadHash: bytes32(uint256(0x5678)),
            confirmations: 1,
            sender: address(0x123)
        });

        uint256 fee = dvnMock.assignJob(param, hex"1234");
        assertEq(fee, 0);
    }

    // Test core business logic - verify function
    function test_verify_success() public {
        bytes32 localOAppB32 = bytes32(uint256(uint160(LOCAL_OAPP)));
        bytes32 expectedGuid = keccak256(
            abi.encodePacked(SAMPLE_NONCE, REMOTE_EID, REMOTE_OAPP, LOCAL_EID, localOAppB32)
        );

        vm.expectEmit(true, false, false, false);
        emit PayloadVerified(expectedGuid);

        vm.prank(owner);
        dvnMock.verify(SAMPLE_MESSAGE, SAMPLE_NONCE, REMOTE_EID, REMOTE_OAPP, LOCAL_EID, LOCAL_OAPP);

        assertTrue(mockReceiveUln.verifyCalled());
    }

    // Test core business logic - commit function
    function test_commit_success() public {
        bytes32 localOAppB32 = bytes32(uint256(uint160(LOCAL_OAPP)));
        bytes32 expectedGuid = keccak256(
            abi.encodePacked(SAMPLE_NONCE, REMOTE_EID, REMOTE_OAPP, LOCAL_EID, localOAppB32)
        );

        vm.expectEmit(true, false, false, false);
        emit PayloadCommitted(expectedGuid);

        vm.prank(owner);
        dvnMock.commit(SAMPLE_MESSAGE, SAMPLE_NONCE, REMOTE_EID, REMOTE_OAPP, LOCAL_EID, LOCAL_OAPP);

        assertTrue(mockReceiveUln.commitCalled());
    }

    // Test custom error handling (our business logic)
    function test_verify_revertsOnInvalidLocalEid() public {
        uint32 wrongEid = 999;

        vm.expectRevert(abi.encodeWithSelector(SimpleDVNMock.InvalidLocalEid.selector, LOCAL_EID, wrongEid));

        vm.prank(owner);
        dvnMock.verify(SAMPLE_MESSAGE, SAMPLE_NONCE, REMOTE_EID, REMOTE_OAPP, wrongEid, LOCAL_OAPP);
    }

    // Test access control - only owner can call verify
    function test_verify_revertsWhenNotOwner() public {
        address nonOwner = makeAddr("nonOwner");

        vm.expectRevert();
        vm.prank(nonOwner);
        dvnMock.verify(SAMPLE_MESSAGE, SAMPLE_NONCE, REMOTE_EID, REMOTE_OAPP, LOCAL_EID, LOCAL_OAPP);
    }

    // Test access control - only owner can call commit
    function test_commit_revertsWhenNotOwner() public {
        address nonOwner = makeAddr("nonOwner");

        vm.expectRevert();
        vm.prank(nonOwner);
        dvnMock.commit(SAMPLE_MESSAGE, SAMPLE_NONCE, REMOTE_EID, REMOTE_OAPP, LOCAL_EID, LOCAL_OAPP);
    }

    // Test commit with invalid localEid
    function test_commit_revertsOnInvalidLocalEid() public {
        uint32 wrongEid = 999;

        vm.expectRevert(abi.encodeWithSelector(SimpleDVNMock.InvalidLocalEid.selector, LOCAL_EID, wrongEid));

        vm.prank(owner);
        dvnMock.commit(SAMPLE_MESSAGE, SAMPLE_NONCE, REMOTE_EID, REMOTE_OAPP, wrongEid, LOCAL_OAPP);
    }
}
