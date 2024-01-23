// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.22;

import { Packet } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ISendLib.sol";
import { OptionsBuilder } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OptionsBuilder.sol";
import { MessagingFee } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import { MessagingReceipt } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OAppSender.sol";
import { MyOApp } from "../../contracts/MyOApp.sol";
import { TestHelper } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelper.sol";

import "forge-std/console.sol";

/// @notice Unit test for MyOApp using the TestHelper.
/// @dev Inherits from TestHelper to utilize its setup and utility functions.
contract MyOAppTest is TestHelper {
    using OptionsBuilder for bytes;

    // Declaration of mock endpoint IDs.
    uint16 aEid = 1;
    uint16 bEid = 2;

    // Declaration of mock contracts.
    MyOApp aMyOApp; // OApp A
    MyOApp bMyOApp; // OApp B

    /// @notice Calls setUp from TestHelper and initializes contract instances for testing.
    function setUp() public virtual override {
        super.setUp();

        // Setup function to initialize 2 Mock Endpoints with Mock MessageLib.
        setUpEndpoints(2, LibraryType.UltraLightNode);

        // Initializes 2 MyOApps; one on chain A, one on chain B.
        address[] memory sender = setupOApps(type(MyOApp).creationCode, 1, 2);
        aMyOApp = MyOApp(payable(sender[0]));
        bMyOApp = MyOApp(payable(sender[1]));
    }

    /// @notice Tests the send and multi-compose functionality of MyOApp.
    /// @dev Simulates message passing from A -> B and checks for data integrity.
    function test_send() public {
        // Setup variable for data values before calling send().
        string memory dataBefore = aMyOApp.data();

        // Generates 1 lzReceive execution option via the OptionsBuilder library.
        // STEP 0: Estimating message gas fees via the quote function.
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(150000, 0);
        MessagingFee memory fee = aMyOApp.quote(bEid, "test message", options, false);

        // STEP 1: Sending a message via the _lzSend() method.
        MessagingReceipt memory receipt = aMyOApp.send{ value: fee.nativeFee }(bEid, "test message", options);

        // Asserting that the receiving OApps have NOT had data manipulated.
        assertEq(bMyOApp.data(), dataBefore, "shouldn't be changed until lzReceive packet is verified");

        // STEP 2 & 3: Deliver packet to bMyOApp manually.
        verifyPackets(bEid, addressToBytes32(address(bMyOApp)));

        // Asserting that the data variable has updated in the receiving OApp.
        assertEq(bMyOApp.data(), "test message", "lzReceive data assertion failure");
    }
}
