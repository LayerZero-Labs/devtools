// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

// MyOApp imports
import { MyOApp, MessagingFee } from "../../contracts/MyOApp.sol";

// OApp imports
import { IOAppOptionsType3, EnforcedOptionParam } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OAppOptionsType3.sol";
import { OptionsBuilder } from "@layerzerolabs/oapp-evm/contracts/oapp/libs/OptionsBuilder.sol";

// OZ imports
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

// DevTools imports
import { TestHelperOz5 } from "@layerzerolabs/test-devtools-evm-foundry/contracts/TestHelperOz5.sol";
import { console } from "forge-std/console.sol";

contract MyOAppTest is TestHelperOz5 {
    using OptionsBuilder for bytes;

    uint32 private aEid = 1;
    uint32 private bEid = 2;

    MyOApp private aOApp;
    MyOApp private bOApp;

    address private userA = address(0x1);
    address private userB = address(0x2);
    uint256 private initialBalance = 100 ether;

    function setUp() public virtual override {
        vm.deal(userA, 1000 ether);
        vm.deal(userB, 1000 ether);

        super.setUp();

        string[] memory forkUrls = new string[](2);
        forkUrls[0] = "https://eth.drpc.org";
        forkUrls[1] = "https://arb1.arbitrum.io/rpc";

        createEndpoints(2, LibraryType.UltraLightNode, new address[](2), forkUrls);

        vm.selectFork(eidForkMap[aEid]);
        aOApp = new MyOApp(address(endpoints[aEid]), address(this));
        vm.selectFork(eidForkMap[bEid]);
        bOApp = new MyOApp(address(endpoints[bEid]), address(this));

        address[] memory oapps = new address[](2);
        oapps[0] = address(aOApp);
        oapps[1] = address(bOApp);
        this.wireOApps(oapps);
    }

    function test_sendMessage() public {
        vm.selectFork(eidForkMap[bEid]);
        assertEq(bOApp.data(), "Nothing received yet.");

        vm.selectFork(eidForkMap[aEid]);
        vm.prank(userA);
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);

        uint256 nativeFee = aOApp.quote(bEid, "hello", options, false).nativeFee;

        aOApp.send{ value: nativeFee }(bEid, "hello", options);

        vm.selectFork(eidForkMap[bEid]);
        verifyPackets(bEid, addressToBytes32(address(bOApp)));

        assertEq(bOApp.data(), "hello");
    }

    function test_send_string() public {
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        string memory message = "Hello, World!";
        MessagingFee memory fee = aOApp.quoteSendString(bEid, message, options, false);

        assertEq(aOApp.lastMessage(), "");
        assertEq(bOApp.lastMessage(), "");

        vm.prank(userA);
        aOApp.sendString{ value: fee.nativeFee }(bEid, message, options);
        verifyPackets(bEid, addressToBytes32(address(bOApp)));

        assertEq(aOApp.lastMessage(), "");
        assertEq(bOApp.lastMessage(), message);
    }
}
