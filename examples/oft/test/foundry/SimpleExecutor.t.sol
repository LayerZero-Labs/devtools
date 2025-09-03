// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import { SimpleExecutorMock } from "../../contracts/mocks/SimpleExecutorMock.sol";
import { DestinationExecutorMock } from "../../contracts/mocks/DestinationExecutorMock.sol";
import { IReceiveUlnE2 } from "@layerzerolabs/lz-evm-messagelib-v2/contracts/uln/interfaces/IReceiveUlnE2.sol";
import { ILayerZeroEndpointV2, Origin } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

// Mock contracts for testing
contract MockEndpoint {
    uint32 public eid;

    constructor(uint32 _eid) {
        eid = _eid;
    }
}

contract MockReceiveUln is IReceiveUlnE2 {
    function verify(bytes calldata, bytes32, uint64) external override {}
    function commitVerification(bytes calldata, bytes32) external override {}
}

contract MockReceiveUlnView {
    enum VerificationState {
        Verifiable,
        Verifying,
        Verified,
        Unverified
    }
    VerificationState public state = VerificationState.Verifiable;

    function verifiable(bytes calldata, bytes32) external view returns (VerificationState) {
        return state;
    }
}

contract SimpleExecutorTest is Test {
    address public admin;
    address public user;
    uint32 public constant LOCAL_EID = 40161;
    uint32 public constant REMOTE_EID = 40232;

    MockEndpoint public mockEndpoint;
    MockReceiveUln public mockReceiveUln;
    MockReceiveUlnView public mockReceiveUlnView;
    SimpleExecutorMock public simpleExecutor;
    DestinationExecutorMock public destinationExecutor;

    function setUp() public {
        admin = makeAddr("admin");
        user = makeAddr("user");

        mockEndpoint = new MockEndpoint(LOCAL_EID);
        mockReceiveUln = new MockReceiveUln();
        mockReceiveUlnView = new MockReceiveUlnView();

        address[] memory messageLibs = new address[](1);
        messageLibs[0] = address(0x123);

        vm.prank(admin);
        simpleExecutor = new SimpleExecutorMock(
            address(mockEndpoint),
            messageLibs,
            address(mockReceiveUln),
            address(mockReceiveUlnView)
        );

        vm.prank(admin);
        destinationExecutor = new DestinationExecutorMock(
            address(mockReceiveUln),
            address(mockReceiveUlnView),
            address(mockEndpoint),
            admin
        );
    }

    // ============================ SimpleExecutorMock Critical Tests ============================

    function test_SimpleExecutor_constructor() public view {
        assertEq(address(simpleExecutor.endpoint()), address(mockEndpoint));
        assertEq(simpleExecutor.localEidV2(), LOCAL_EID);
        assertTrue(simpleExecutor.hasRole(simpleExecutor.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(simpleExecutor.hasRole(keccak256("ADMIN_ROLE"), admin));
    }

    function test_SimpleExecutor_assignJob_returnsZero() public {
        vm.prank(address(0x123));
        uint256 fee = simpleExecutor.assignJob(REMOTE_EID, user, 1000, hex"1234");
        assertEq(fee, 0);
    }

    function test_SimpleExecutor_getFee_returnsZero() public view {
        uint256 fee = simpleExecutor.getFee(REMOTE_EID, user, 1000, hex"1234");
        assertEq(fee, 0);
    }

    function test_SimpleExecutor_assignJob_revertsWhenNotMessageLib() public {
        vm.expectRevert();
        vm.prank(user);
        simpleExecutor.assignJob(REMOTE_EID, user, 1000, hex"1234");
    }

    // Removed paused-path test since setPaused is no longer exposed

    // Removed setPaused tests since the function no longer exists

    // ============================ DestinationExecutorMock Critical Tests ============================

    function test_DestinationExecutor_constructor() public view {
        assertEq(address(destinationExecutor.endpoint()), address(mockEndpoint));
        assertEq(destinationExecutor.localEid(), LOCAL_EID);
        assertEq(destinationExecutor.receiveUln302(), address(mockReceiveUln));
        assertEq(destinationExecutor.owner(), admin);
    }

    function test_DestinationExecutor_withdrawNative_success() public {
        vm.deal(address(destinationExecutor), 1 ether);

        vm.prank(admin);
        destinationExecutor.withdrawNative(user, 0.5 ether);

        assertEq(user.balance, 0.5 ether);
    }

    function test_DestinationExecutor_withdrawNative_revertsWhenNotOwner() public {
        vm.expectRevert();
        vm.prank(user);
        destinationExecutor.withdrawNative(user, 0.5 ether);
    }

    function test_DestinationExecutor_setReceiveLibView_success() public {
        address newView = address(0x789);

        vm.prank(admin);
        destinationExecutor.setReceiveLibView(address(mockReceiveUln), newView);

        assertEq(destinationExecutor.receiveLibToView(address(mockReceiveUln)), newView);
    }
}
