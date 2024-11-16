// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// MyOApp imports

import { ReadPublic } from "../../contracts/ReadPublic.sol";
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

contract ReadPublicTest is TestHelperOz5 {
    using OptionsBuilder for bytes;

    uint32 private aEid = 1; // Chain A Endpoint ID
    uint32 private bEid = 2; // Chain B Endpoint ID

    ReadPublic private bOApp; // Deployed on chain B
    ExampleContract private exampleContract; // Deployed on chain A

    address private userA = address(0x1);

    uint16 private constant READ_TYPE = 1;

    function setUp() public virtual override {
        vm.deal(userA, 1000 ether);

        super.setUp();
        setUpEndpoints(2, LibraryType.UltraLightNode);

        // Deploy ExampleContract on chain A (aEid)
        // We simulate chain A by associating contracts with aEid
        exampleContract = ExampleContract(
            _deployOApp(
                type(ExampleContract).creationCode,
                abi.encode(uint256(42)) // Initialize data to 42
            )
        );

        // Deploy ReadPublic on chain B (bEid)
        bOApp = ReadPublic(
            _deployOApp(
                type(ReadPublic).creationCode,
                abi.encode(address(endpoints[bEid]), address(this), DEFAULT_CHANNEL_ID)
            )
        );

        // Wire the OApps
        address[] memory oapps = new address[](1);
        oapps[0] = address(bOApp);
        uint32[] memory channels = new uint32[](1);
        channels[0] = DEFAULT_CHANNEL_ID;
        this.wireReadOApps(oapps, channels);
    }

    function test_constructor() public {
        assertEq(bOApp.owner(), address(this));
        assertEq(address(bOApp.endpoint()), address(endpoints[bEid]));
    }

    function test_send_read() public {
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReadOption(1e8, 100, 0);
        console.logBytes(options);

        // Prepare the read request parameters
        uint32 targetEid = aEid;
        address targetContractAddress = address(exampleContract);

        // Estimate the fee (you might need to adjust this based on your setup)
        MessagingFee memory fee = bOApp.quoteReadFee(targetContractAddress, targetEid, options);

        // Record logs to capture the DataReceived event
        vm.recordLogs();

        // User A initiates the read request on bOApp
        vm.prank(userA);
        bOApp.readData{ value: fee.nativeFee }(
            targetContractAddress,
            targetEid,
            options
        );

        // Process the response packet to bOApp on bEid, injecting the data 42
        this.verifyPackets(bEid, addressToBytes32(address(bOApp)), 0, address(0x0), abi.encode(uint256(42)));

        // Retrieve the logs to verify the DataReceived event
        Vm.Log[] memory entries = vm.getRecordedLogs();
        bool found = false;
        uint256 dataReceived;
        for (uint256 i = 0; i < entries.length; i++) {
            Vm.Log memory entry = entries[i];
            if (entry.topics[0] == keccak256("DataReceived(uint256)")) {
                dataReceived = abi.decode(entry.data, (uint256));
                found = true;
                break;
            }
        }
        require(found, "DataReceived event not found");
        assertEq(dataReceived, 42, "Data received does not match expected value");
    }
}
