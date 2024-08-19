// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { ReceiveConfig } from "@layerzerolabs/ua-devtools-evm-foundry/src/ReceiveConfig.sol";

// Forge imports
import "forge-std/console.sol";
import { Test } from "forge-std/Test.sol";

contract ReceiveConfigTest is Test {

    // EndpointV2Mock endpoint;
    // ReceiveConfig receiveConfig;

    // function setUp() public virtual override {
    //     vm.deal(userA, 1000 ether);
    //     vm.deal(userB, 1000 ether);

    //     super.setUp();
    //     setUpEndpoints(2, LibraryType.UltraLightNode);

    //     aOFT = OFTMock(
    //         _deployOApp(type(OFTMock).creationCode, abi.encode("aOFT", "aOFT", address(endpoints[aEid]), address(this)))
    //     );

    //     bOFT = OFTMock(
    //         _deployOApp(type(OFTMock).creationCode, abi.encode("bOFT", "bOFT", address(endpoints[bEid]), address(this)))
    //     );

    //     // config and wire the ofts
    //     address[] memory ofts = new address[](2);
    //     ofts[0] = address(aOFT);
    //     ofts[1] = address(bOFT);
    //     this.wireOApps(ofts);

    //     // mint tokens
    //     aOFT.mint(userA, initialBalance);
    //     bOFT.mint(userB, initialBalance);
    // }

    function test_receiveConfig() public {
        console.log("ReceiveConfigTest.test_receiveConfig");
    }
}