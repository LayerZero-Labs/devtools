// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

/// -----------------------------------------------------------------------
/// Imports
/// -----------------------------------------------------------------------

import { TestHelperOz5, console } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";

import { OmniRead, IOmniRead, MessagingFee, MessagingReceipt, Origin } from "../../contracts/OmniRead.sol";
import { OmniReadFixture } from "./OmniReadFixture.sol";
import { ERC20Mock, ERC20 } from "./mocks/ERC20Mock.sol";

/// -----------------------------------------------------------------------
/// Contract (test)
/// -----------------------------------------------------------------------

/**
 * @title OmniReadTest
 * @notice A test for the OmniRead contract.
 */
contract OmniReadTest is TestHelperOz5 {
    OmniRead public srcOmniRead;
    OmniReadFixture public fixture;

    ERC20Mock public token;

    uint32 public readEid = 1;
    uint32 public fixtureEid = 2;

    address public owner = makeAddr("owner");
    address public user = makeAddr("user");
    address public srcAddress = makeAddr("srcAddress");
    address public dstAddress = makeAddr("dstAddress");

    uint256 public constant INITIAL_BALANCE = 10 ether;
    uint256 public constant TOKEN_BALANCE = 1 ether;

    function setUp() public override {
        deal(srcAddress, INITIAL_BALANCE);
        deal(dstAddress, INITIAL_BALANCE);

        super.setUp();
        setUpEndpoints(2, LibraryType.UltraLightNode);

        token = new ERC20Mock("Mock", "MCK");
        srcOmniRead = new OmniRead(endpoints[readEid], owner);
        fixture = new OmniReadFixture(endpoints[fixtureEid], owner);

        deal(address(token), srcAddress, TOKEN_BALANCE);

        address[] memory omniReads = new address[](2);
        omniReads[0] = address(srcOmniRead);
        omniReads[1] = address(fixture);
        uint32[] memory channels = new uint32[](2);
        channels[0] = DEFAULT_CHANNEL_ID;
        channels[1] = DEFAULT_CHANNEL_ID;
        vm.startPrank(owner);
        wireReadOApps(omniReads, channels);
        vm.stopPrank();

        deal(address(srcOmniRead), INITIAL_BALANCE);
        deal(user, INITIAL_BALANCE);
    }

    /// -----------------------------------------------------------------------
    /// Internal functions
    /// -----------------------------------------------------------------------

    function test_lzReceiveInternal_success() public {
        bytes32 guid = keccak256("guid");
        bytes memory payload = abi.encode("return data");

        bytes memory responseBefore = fixture.getResponse(guid);

        fixture.lzReceiveInternal(
            Origin({ srcEid: readEid, sender: bytes32(uint256(uint160(address(srcOmniRead)))), nonce: 0 }),
            guid,
            payload,
            address(0),
            ""
        );

        bytes memory responseAfter = fixture.getResponse(guid);

        assertEq(responseBefore, "");
        assertEq(responseAfter, payload);
    }

    function test_readInternal_success() public {
        OmniRead.OmniReadRequest[] memory readRequests = new OmniRead.OmniReadRequest[](2);
        readRequests[0] = IOmniRead.OmniReadRequest({
            targetEid: readEid,
            isBlockNum: false,
            blockNumOrTimestamp: uint64(block.timestamp),
            confirmations: 0,
            to: address(token),
            callData: abi.encodeWithSelector(ERC20.balanceOf.selector, srcAddress)
        });
        readRequests[1] = IOmniRead.OmniReadRequest({
            targetEid: readEid,
            isBlockNum: false,
            blockNumOrTimestamp: uint64(block.timestamp),
            confirmations: 0,
            to: address(token),
            callData: abi.encodeWithSelector(ERC20.balanceOf.selector, srcAddress)
        });
        uint128 readGasLimit = 100000;
        uint32 returnDataSize = 64;
        uint128 msgValue = 0;
        bytes32 identifier = bytes32(0);

        MessagingFee memory fee = fixture.quoteBatch(readRequests, readGasLimit, returnDataSize, msgValue);

        vm.prank(user);
        MessagingReceipt memory receipt = fixture.readInternal{ value: fee.nativeFee }(
            readRequests,
            readGasLimit,
            returnDataSize,
            msgValue,
            identifier
        );
        verifyPackets(
            fixtureEid,
            addressToBytes32(address(fixture)),
            0,
            address(0x0),
            abi.encode(TOKEN_BALANCE, TOKEN_BALANCE)
        );

        bytes memory response = fixture.getResponse(receipt.guid);

        assertEq(response, abi.encode(TOKEN_BALANCE, TOKEN_BALANCE));
        assertEq(receipt.fee.nativeFee, fee.nativeFee);
        assertEq(receipt.fee.lzTokenFee, 0);
        assertNotEq(receipt.guid, bytes32(0));
        assertEq(user.balance, INITIAL_BALANCE - fee.nativeFee);
        assertEq(receipt.nonce, 1);
    }

    function test_readInternal_event_emitted() public {
        OmniRead.OmniReadRequest[] memory readRequests = new OmniRead.OmniReadRequest[](2);
        readRequests[0] = IOmniRead.OmniReadRequest({
            targetEid: readEid,
            isBlockNum: false,
            blockNumOrTimestamp: uint64(block.timestamp),
            confirmations: 0,
            to: address(token),
            callData: abi.encodeWithSelector(ERC20.balanceOf.selector, srcAddress)
        });
        readRequests[1] = IOmniRead.OmniReadRequest({
            targetEid: readEid,
            isBlockNum: false,
            blockNumOrTimestamp: uint64(block.timestamp),
            confirmations: 0,
            to: address(token),
            callData: abi.encodeWithSelector(ERC20.balanceOf.selector, srcAddress)
        });

        uint128 readGasLimit = 100000;
        uint32 returnDataSize = 64;
        uint128 msgValue = 0;
        bytes32 identifier = bytes32(0);

        MessagingFee memory fee = fixture.quoteBatch(readRequests, readGasLimit, returnDataSize, msgValue);

        vm.prank(user);
        vm.expectEmit(true, true, false, false, address(fixture));
        emit IOmniRead.ReadRequestSent(user, identifier, bytes32(0));
        fixture.readInternal{ value: fee.nativeFee }(readRequests, readGasLimit, returnDataSize, msgValue, identifier);
    }

    function test_buildCmdInternal_success() public view {
        IOmniRead.OmniReadRequest[] memory readRequests = new IOmniRead.OmniReadRequest[](2);
        readRequests[0] = IOmniRead.OmniReadRequest({
            targetEid: readEid,
            isBlockNum: false,
            blockNumOrTimestamp: uint64(block.timestamp),
            confirmations: 0,
            to: address(token),
            callData: abi.encodeWithSelector(ERC20.balanceOf.selector, srcAddress)
        });
        readRequests[1] = IOmniRead.OmniReadRequest({
            targetEid: readEid,
            isBlockNum: false,
            blockNumOrTimestamp: uint64(block.timestamp),
            confirmations: 0,
            to: address(token),
            callData: abi.encodeWithSelector(ERC20.balanceOf.selector, srcAddress)
        });

        bytes memory cmd = fixture.buildCmdInternal(readRequests);

        assertTrue(cmd.length > 0);
    }

    function test_quoteWithOptionsInternal_success() public view {
        OmniRead.OmniReadRequest[] memory readRequests = new OmniRead.OmniReadRequest[](2);
        readRequests[0] = IOmniRead.OmniReadRequest({
            targetEid: readEid,
            isBlockNum: false,
            blockNumOrTimestamp: uint64(block.timestamp),
            confirmations: 0,
            to: address(token),
            callData: abi.encodeWithSelector(ERC20.balanceOf.selector, srcAddress)
        });
        readRequests[1] = IOmniRead.OmniReadRequest({
            targetEid: readEid,
            isBlockNum: false,
            blockNumOrTimestamp: uint64(block.timestamp),
            confirmations: 0,
            to: address(token),
            callData: abi.encodeWithSelector(ERC20.balanceOf.selector, srcAddress)
        });

        uint128 readGasLimit = 100000;
        uint32 returnDataSize = 64;
        uint128 msgValue = 0;

        (MessagingFee memory fee, bytes memory options, bytes memory payload) = fixture.quoteWithOptionsInternal(
            readRequests,
            readGasLimit,
            returnDataSize,
            msgValue
        );

        assertTrue(fee.nativeFee > 0);
        assertEq(fee.lzTokenFee, 0);
        assertTrue(options.length > 0);
        assertTrue(payload.length > 0);
    }

    /// -----------------------------------------------------------------------
    /// State-change public/external functions
    /// -----------------------------------------------------------------------

    function test_constructor() public view {
        assertEq(srcOmniRead.owner(), owner);
        assertEq(address(srcOmniRead.endpoint()), address(endpoints[readEid]));
        assertEq(address(fixture.endpoint()), address(endpoints[fixtureEid]));
    }

    function test_readSimple_success() public {
        IOmniRead.OmniReadRequest memory readRequest = IOmniRead.OmniReadRequest({
            targetEid: fixtureEid,
            isBlockNum: false,
            blockNumOrTimestamp: uint64(block.timestamp),
            confirmations: 0,
            to: address(token),
            callData: abi.encodeWithSelector(ERC20.balanceOf.selector, srcAddress)
        });

        uint128 readGasLimit = 100000;
        uint32 returnDataSize = 64;
        uint128 msgValue = 0;
        bytes32 identifier = bytes32(0);

        MessagingFee memory fee = srcOmniRead.quoteSingle(readRequest, readGasLimit, returnDataSize, msgValue);

        vm.prank(user);
        MessagingReceipt memory receipt = srcOmniRead.readSingle{ value: fee.nativeFee }(
            readRequest,
            readGasLimit,
            returnDataSize,
            msgValue,
            identifier
        );
        verifyPackets(fixtureEid, addressToBytes32(address(srcOmniRead)));

        assertEq(receipt.fee.nativeFee, fee.nativeFee);
        assertEq(receipt.fee.lzTokenFee, 0);
        assertNotEq(receipt.guid, bytes32(0));
        assertEq(user.balance, INITIAL_BALANCE - fee.nativeFee);
        assertEq(receipt.nonce, 1);
    }

    function test_readBatch_success() public {
        IOmniRead.OmniReadRequest[] memory readRequests = new IOmniRead.OmniReadRequest[](2);
        readRequests[0] = IOmniRead.OmniReadRequest({
            targetEid: fixtureEid,
            isBlockNum: false,
            blockNumOrTimestamp: uint64(block.timestamp),
            confirmations: 0,
            to: address(token),
            callData: abi.encodeWithSelector(ERC20.balanceOf.selector, srcAddress)
        });
        readRequests[1] = IOmniRead.OmniReadRequest({
            targetEid: fixtureEid,
            isBlockNum: false,
            blockNumOrTimestamp: uint64(block.timestamp),
            confirmations: 0,
            to: address(token),
            callData: abi.encodeWithSelector(ERC20.balanceOf.selector, srcAddress)
        });
        uint128 readGasLimit = 100000;
        uint32 returnDataSize = 64;
        uint128 msgValue = 0;
        bytes32 identifier = bytes32(0);

        MessagingFee memory fee = srcOmniRead.quoteBatch(readRequests, readGasLimit, returnDataSize, msgValue);

        vm.prank(user);
        MessagingReceipt memory receipt = srcOmniRead.readBatch{ value: fee.nativeFee }(
            readRequests,
            readGasLimit,
            returnDataSize,
            msgValue,
            identifier
        );
        verifyPackets(fixtureEid, addressToBytes32(address(srcOmniRead)));

        assertEq(receipt.fee.nativeFee, fee.nativeFee);
        assertEq(receipt.fee.lzTokenFee, 0);
        assertNotEq(receipt.guid, bytes32(0));
        assertEq(user.balance, INITIAL_BALANCE - fee.nativeFee);
        assertEq(receipt.nonce, 1);
    }

    /// -----------------------------------------------------------------------
    /// View public/external functions
    /// -----------------------------------------------------------------------

    function test_quoteSimple_success() public view {
        IOmniRead.OmniReadRequest memory readRequest = IOmniRead.OmniReadRequest({
            targetEid: fixtureEid,
            isBlockNum: false,
            blockNumOrTimestamp: uint64(block.timestamp),
            confirmations: 0,
            to: address(token),
            callData: abi.encodeWithSelector(ERC20.balanceOf.selector, srcAddress)
        });

        uint128 readGasLimit = 100000;
        uint32 returnDataSize = 64;
        uint128 msgValue = 0;

        MessagingFee memory fee = srcOmniRead.quoteSingle(readRequest, readGasLimit, returnDataSize, msgValue);

        assertTrue(fee.nativeFee > 0);
        assertEq(fee.lzTokenFee, 0);
    }

    function test_quoteBatch_success() public view {
        IOmniRead.OmniReadRequest[] memory readRequests = new IOmniRead.OmniReadRequest[](2);
        readRequests[0] = IOmniRead.OmniReadRequest({
            targetEid: fixtureEid,
            isBlockNum: false,
            blockNumOrTimestamp: uint64(block.timestamp),
            confirmations: 0,
            to: address(token),
            callData: abi.encodeWithSelector(ERC20.balanceOf.selector, srcAddress)
        });
        readRequests[1] = IOmniRead.OmniReadRequest({
            targetEid: fixtureEid,
            isBlockNum: false,
            blockNumOrTimestamp: uint64(block.timestamp),
            confirmations: 0,
            to: address(token),
            callData: abi.encodeWithSelector(ERC20.balanceOf.selector, srcAddress)
        });
        uint128 readGasLimit = 100000;
        uint32 returnDataSize = 64;
        uint128 msgValue = 0;

        MessagingFee memory fee = srcOmniRead.quoteBatch(readRequests, readGasLimit, returnDataSize, msgValue);

        assertTrue(fee.nativeFee > 0);
        assertEq(fee.lzTokenFee, 0);
    }

    function test_getResponse_success() public view {
        bytes32 guid = keccak256("guid");

        assertEq(fixture.getResponse(guid), "");
    }

    function test_getReadChannel_success() public view {
        assertEq(srcOmniRead.getReadChannel(), DEFAULT_CHANNEL_ID);
    }

    function test_getReadChannelEidThreshold_success() public view {
        assertEq(srcOmniRead.getReadChannelEidThreshold(), DEFAULT_CHANNEL_ID);
    }
}
