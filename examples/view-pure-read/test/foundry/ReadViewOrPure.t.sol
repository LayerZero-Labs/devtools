// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// MyOApp imports
import { ReadViewOrPure } from "../../contracts/ReadViewOrPure.sol";
import { ExampleContract } from "../../contracts/ExampleContract.sol";

// OApp imports
import { IOAppOptionsType3, EnforcedOptionParam } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";
import { MessagingFee, MessagingReceipt } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";

// OZ imports
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

// Forge imports
import "forge-std/console.sol";
import "forge-std/Test.sol";

// DevTools imports
import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";

/**
 * @title ReadViewOrPureTest
 * @notice A test suite for the ReadViewOrPure contract.
 */
contract ReadViewOrPureTest is TestHelperOz5 {
    using OptionsBuilder for bytes;

    /// @notice Chain A Endpoint ID.
    uint32 private aEid = 1;

    /// @notice Chain B Endpoint ID.
    uint32 private bEid = 2;

    /// @notice The ReadViewOrPure contract deployed on chain B.
    ReadViewOrPure private bOApp;

    /// @notice The ExampleContract deployed on chain A.
    ExampleContract private exampleContract;

    /// @notice Address representing User A.
    address private userA = address(0x1);

    /// @notice Message type for the read operation.
    uint16 private constant READ_TYPE = 1;

    /**
     * @notice Sets up the test environment before each test.
     *
     * @dev Deploys the ExampleContract on chain A and the ReadViewOrPure contract on chain B.
     *      Wires the OApps and sets up the endpoints.
     */
    function setUp() public virtual override {
        vm.deal(userA, 1000 ether);

        super.setUp();
        setUpEndpoints(2, LibraryType.UltraLightNode);

        // Deploy ExampleContract on chain A (aEid)
        // We simulate chain A by associating contracts with aEid
        exampleContract = ExampleContract(
            _deployOApp(
                type(ExampleContract).creationCode,
                abi.encode() // No constructor arguments needed for ExampleContract
            )
        );

        // Deploy ReadViewOrPure on chain B (bEid)
        bOApp = ReadViewOrPure(
            _deployOApp(
                type(ReadViewOrPure).creationCode,
                abi.encode(
                    address(endpoints[bEid]), // _endpoint (LayerZero endpoint on chain B)
                    DEFAULT_CHANNEL_ID, // _readChannel
                    aEid, // _targetEid (Endpoint ID of chain A)
                    address(exampleContract) // _targetContractAddress (ExampleContract on chain A)
                )
            )
        );

        // Wire the OApps
        address[] memory oapps = new address[](1);
        oapps[0] = address(bOApp);
        uint32[] memory channels = new uint32[](1);
        channels[0] = DEFAULT_CHANNEL_ID;
        this.wireReadOApps(oapps, channels);
    }

    /**
     * @notice Tests that the constructor initializes the contract correctly.
     *
     * @dev Verifies that the owner, endpoint, READ_CHANNEL, targetEid, and targetContractAddress are set as expected.
     */
    function test_constructor() public {
        // Verify that the owner is correctly set
        assertEq(bOApp.owner(), address(this));
        // Verify that the endpoint is correctly set
        assertEq(address(bOApp.endpoint()), address(endpoints[bEid]));
        // Verify that READ_CHANNEL is correctly set
        assertEq(bOApp.READ_CHANNEL(), DEFAULT_CHANNEL_ID);
        // Verify that targetEid is correctly set
        assertEq(bOApp.targetEid(), aEid);
        // Verify that targetContractAddress is correctly set
        assertEq(bOApp.targetContractAddress(), address(exampleContract));
    }

    /**
     * @notice Tests sending a read request and handling the received sum.
     *
     * @dev Simulates a user initiating a read request to add two numbers and verifies that the SumReceived event is emitted with the correct sum.
     */
    function test_send_read() public {
        // Prepare messaging options
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReadOption(1e8, 100, 0);
        console.logBytes(options);

        // Define the numbers to add
        uint256 a = 2;
        uint256 b = 3;
        uint256 expectedSum = a + b;

        // Estimate the fee for calling readSum with arguments a and b
        MessagingFee memory fee = bOApp.quoteReadFee(a, b, options);

        // Record logs to capture the SumReceived event
        vm.recordLogs();

        // User A initiates the read request on bOApp
        vm.prank(userA);
        bOApp.readSum{ value: fee.nativeFee }(a, b, options);

        // Simulate processing the response packet to bOApp on bEid, injecting the sum
        this.verifyPackets(
            bEid,
            addressToBytes32(address(bOApp)),
            0,
            address(0x0),
            abi.encode(expectedSum) // The sum of a and b
        );

        // Retrieve the logs to verify the SumReceived event
        Vm.Log[] memory entries = vm.getRecordedLogs();
        bool found = false;
        uint256 sumReceived;
        for (uint256 i = 0; i < entries.length; i++) {
            Vm.Log memory entry = entries[i];
            if (entry.topics[0] == keccak256("SumReceived(uint256)")) {
                sumReceived = abi.decode(entry.data, (uint256));
                found = true;
                break;
            }
        }
        require(found, "SumReceived event not found");
        assertEq(sumReceived, expectedSum, "Sum received does not match expected value");
    }
}
